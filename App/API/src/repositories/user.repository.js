const { error } = require("winston");
const DatabaseService = require("../services/database_service");
const logger = require("../utils/logger");
const database_service = new DatabaseService();

class UserRepository {
    constructor(){};
    async getUserByEmail(email) {
        try {
            const query = `SELECT * FROM sec_user WHERE email=$1 LIMIT 1`;
            const values = [email];
            const res = await database_service.query(query, values, true);
            if (!res.success || res.rowCount === 0) {
                logger.error(`[UserRepository][getUserByEmail]  Error: ${res.error} `);
                return null;
            }
            return res.data[0];
        } catch (error) {
            logger.error(`[UserRepository][getUserByEmail] Error al obtener usuario por email: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async validateExistingUser(email) {
        try {
            const query = `SELECT 1 FROM sec_user WHERE email=$1 LIMIT 1`;
            const values = [email];
            const res = await database_service.query(query, values, true);
            if (!res.success) {
                logger.error(`[UserRepository][validateExistingUser] Error al validar la exsitencia del usaurio: ${res.error}`);
                return { success: false, error: res.error };
            }
            return res.rowCount > 0;
        } catch (error) {
            logger.error(`[UserRepository][validateExistingUser] Error validando la existencia del usuario: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async createUser(data_dict) {
        try {
            // Primera insercion a la tabla sec_user para obtener el ID del usuario, necesario para insertar la contraseña hasheada en la tabla sec_user_password
            const query = `
        INSERT INTO sec_user (
          username, email, display_name,
          first_name, last_name, is_active,
          must_change_password, last_login_at,
          created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING user_id`;

            const values = [
                data_dict.username,
                data_dict.email,
                data_dict.display_name,
                capitalizeFirstLetter(data_dict.first_name),
                capitalizeFirstLetter(data_dict.last_name),
                data_dict.is_active,
                data_dict.must_change_password,
                data_dict.last_login_at,
                data_dict.created_at,
                data_dict.updated_at
            ];

            const response = await database_service.query(query, values, true);

            const query2 = `
        INSERT INTO sec_user_password (
          user_id, password_hash, password_algorithm,
          password_updated_at, failed_attempts,
          locked_until, is_active, created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`;
            const hashedPasswd = await generatePasswordHash(data_dict.password);
            const values_passwd = [
                response.data[0].user_id,
                hashedPasswd.password_hash,
                hashedPasswd.password_algorithm,
                new Date(),
                0,
                null,
                true,
                new Date(),
                new Date()
            ];
            const resp_passwd = await database_service.query(query2, values_passwd); // se valida la insercion de la contraseña hasheada

            if (!response.success || !resp_passwd.success) {
                logger.error('[DatabaseService][insertUser] Error al insertar al usuario');
                return false;
            }

            return true;

        } catch (error) {
            logger.error('[DatabaseService][insertUser] Error al insertar usuario en la BD: ' + error.message);
            return false;
        }
    }

    async recoverHashedPassword(user_id) {
        try {
            const query = 'SELECT password_hash FROM sec_user_password WHERE user_id=$1 AND is_active=true LIMIT 1';
            const values = [user_id];
            const res = await database_service.query(query, values, true);
            if (!res.success || res.rowCount === 0) {
                logger.error('[DatabaseService][recoverHashedPassword] Error al recuperar el hash de contraseña: ' + res.error);
                return null;
            }
            return res.data[0].password_hash;
        } catch (error) {
            logger.error('[DatabaseService][recoverHashedPassword] Error al recuperar el hash de contraseña: ' + error.message);
            return null;
        }
    }
}

module.exports = UserRepository;
