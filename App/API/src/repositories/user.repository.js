const DatabaseService = require("../services/database_service");
const logger = require("../utils/logger");
const { generatePasswordHash } = require('../helpers/auth_helpers');
const { capitalizeFirstLetter } = require('../utils/util');

const database_service = new DatabaseService();

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

class UserRepository {
    constructor() {}

    async getUserByEmail(email) {
        try {
            const query = `
                SELECT user_id, email, username, display_name, first_name, last_name, is_active, last_login_at
                FROM sec_user WHERE lower(email) = lower($1) LIMIT 1
            `;
            const res = await database_service.query(query, [email], true);
            if (!res.success || res.rowCount === 0) return null;
            return res.data[0];
        } catch (error) {
            logger.error(`[UserRepository][getUserByEmail] Error: ${error.message}`);
            return null;
        }
    }

    async getUserById(user_id) {
        try {
            const query = `
                SELECT user_id, email, username, display_name, first_name, last_name, is_active, last_login_at
                FROM sec_user WHERE user_id = $1 AND is_active = true LIMIT 1
            `;
            const res = await database_service.query(query, [user_id], true);
            if (!res.success || res.rowCount === 0) return null;
            return res.data[0];
        } catch (error) {
            logger.error(`[UserRepository][getUserById] Error: ${error.message}`);
            return null;
        }
    }

    async validateExistingUser(email) {
        try {
            const query = `SELECT 1 FROM sec_user WHERE lower(email) = lower($1) LIMIT 1`;
            const res = await database_service.query(query, [email], true);
            if (!res.success) return { success: false, error: res.error };
            return res.rowCount > 0;
        } catch (error) {
            logger.error(`[UserRepository][validateExistingUser] Error: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async createUser(data_dict) {
        try {
            const hashedPasswd = await generatePasswordHash(data_dict.password);

            await database_service.withTransaction(async (client) => {
                const r1 = await client.query(`
                    INSERT INTO sec_user (
                        username, email, display_name,
                        first_name, last_name,
                        phone, location, occupation,
                        is_active, must_change_password,
                        last_login_at, created_at, updated_at
                    )
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
                    RETURNING user_id
                `, [
                    data_dict.username,
                    data_dict.email,
                    data_dict.display_name,
                    capitalizeFirstLetter(data_dict.first_name),
                    capitalizeFirstLetter(data_dict.last_name),
                    data_dict.phone    ?? null,
                    data_dict.location ?? null,
                    data_dict.occupation ?? null,
                    data_dict.is_active,
                    data_dict.must_change_password,
                    data_dict.last_login_at,
                    data_dict.created_at,
                    data_dict.updated_at
                ]);

                const user_id = r1.rows[0].user_id;

                await client.query(
                    `UPDATE sec_user SET created_by = $1 WHERE user_id = $1`,
                    [user_id]
                );

                await client.query(`
                    INSERT INTO sec_user_password (
                        user_id, password_hash, password_algorithm,
                        password_updated_at, failed_attempts,
                        locked_until, is_active, created_at, updated_at
                    )
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                `, [
                    user_id,
                    hashedPasswd.password_hash,
                    hashedPasswd.password_algorithm,
                    new Date(),
                    0,
                    null,
                    true,
                    new Date(),
                    new Date()
                ]);
            });

            return true;
        } catch (error) {
            logger.error('[UserRepository][createUser] Error: ' + error.message);
            return false;
        }
    }

    async recoverHashedPassword(user_id) {
        try {
            const query = 'SELECT password_hash FROM sec_user_password WHERE user_id=$1 AND is_active=true LIMIT 1';
            const res = await database_service.query(query, [user_id], true);
            if (!res.success || res.rowCount === 0) return null;
            return res.data[0].password_hash;
        } catch (error) {
            logger.error('[UserRepository][recoverHashedPassword] Error: ' + error.message);
            return null;
        }
    }

    async checkAccountLocked(user_id) {
        try {
            const query = `
                SELECT locked_until, failed_attempts
                FROM sec_user_password
                WHERE user_id = $1 AND is_active = true
                LIMIT 1
            `;
            const res = await database_service.query(query, [user_id], true);
            if (!res.success || res.rowCount === 0) return { locked: false };
            const { locked_until, failed_attempts } = res.data[0];
            if (locked_until && new Date(locked_until) > new Date()) {
                return { locked: true, locked_until };
            }
            return { locked: false, failed_attempts };
        } catch (error) {
            logger.error('[UserRepository][checkAccountLocked] Error: ' + error.message);
            return { locked: false };
        }
    }

    async incrementFailedAttempts(user_id) {
        try {
            const query = `
                UPDATE sec_user_password
                SET
                    failed_attempts = failed_attempts + 1,
                    locked_until = CASE
                        WHEN failed_attempts + 1 >= $2
                        THEN NOW() + INTERVAL '${LOCK_DURATION_MINUTES} minutes'
                        ELSE locked_until
                    END,
                    updated_at = NOW()
                WHERE user_id = $1 AND is_active = true
            `;
            await database_service.query(query, [user_id, MAX_FAILED_ATTEMPTS]);
        } catch (error) {
            logger.error('[UserRepository][incrementFailedAttempts] Error: ' + error.message);
        }
    }

    async resetFailedAttempts(user_id) {
        try {
            const query = `
                UPDATE sec_user_password
                SET failed_attempts = 0, locked_until = NULL, updated_at = NOW()
                WHERE user_id = $1 AND is_active = true
            `;
            await database_service.query(query, [user_id]);
        } catch (error) {
            logger.error('[UserRepository][resetFailedAttempts] Error: ' + error.message);
        }
    }

    async updateLastLogin(user_id) {
        try {
            const query = `UPDATE sec_user SET last_login_at = NOW() WHERE user_id = $1`;
            await database_service.query(query, [user_id]);
        } catch (error) {
            logger.error('[UserRepository][updateLastLogin] Error: ' + error.message);
        }
    }

    async validateEmailAvailable(email, exclude_user_id) {
        try {
            const res = await database_service.query(
                `SELECT 1 FROM sec_user WHERE lower(email) = lower($1) AND user_id != $2 AND is_active = true LIMIT 1`,
                [email, exclude_user_id],
                true
            );
            if (!res.success) return null;
            return res.rowCount === 0;
        } catch (error) {
            logger.error(`[UserRepository][validateEmailAvailable] Error: ${error.message}`);
            return null;
        }
    }

    async getProfile(user_id) {
        try {
            const query = `
                SELECT user_id, email, username, display_name, first_name, last_name,
                       phone, location, occupation, avatar_url, last_login_at
                FROM sec_user
                WHERE user_id = $1 AND is_active = true
                LIMIT 1
            `;
            const res = await database_service.query(query, [user_id], true);
            if (!res.success || res.rowCount === 0) return null;
            return res.data[0];
        } catch (error) {
            logger.error(`[UserRepository][getProfile] Error: ${error.message}`);
            return null;
        }
    }

    async updateProfile(user_id, { display_name, email, phone, location, occupation, avatar_url }) {
        try {
            const query = `
                UPDATE sec_user
                SET
                    display_name = COALESCE($2, display_name),
                    email        = COALESCE($3, email),
                    phone        = $4,
                    location     = $5,
                    occupation   = $6,
                    avatar_url   = COALESCE($7, avatar_url),
                    updated_at   = NOW()
                WHERE user_id = $1 AND is_active = true
            `;
            const res = await database_service.query(query, [
                user_id,
                display_name ?? null,
                email       ?? null,
                phone       ?? null,
                location    ?? null,
                occupation  ?? null,
                avatar_url  ?? null,
            ]);
            if (!res.success) {
                logger.error(`[UserRepository][updateProfile] Query failed: ${res.error}`);
                return false;
            }
            return true;
        } catch (error) {
            logger.error(`[UserRepository][updateProfile] Error: ${error.message}`);
            return false;
        }
    }
}

module.exports = UserRepository;
