const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const UserRepository = require("../repositories/user.repository");
const user_repository = new UserRepository();
const { compareHash, generateJwtToken, generateRefreshToken } = require('../helpers/auth_helpers');

class AuthService {
    constructor() {}

    async ValidateUser(email, password) {
        try {
            const user = await user_repository.getUserByEmail(email);
            if (!user) {
                logger.warn('[AuthService][ValidateUser] Usuario no encontrado: ' + email);
                return null;
            }

            const lockStatus = await user_repository.checkAccountLocked(user.user_id);
            if (lockStatus.locked) {
                logger.warn('[AuthService][ValidateUser] Cuenta bloqueada: ' + email);
                return { locked: true, locked_until: lockStatus.locked_until };
            }

            const password_hash = await user_repository.recoverHashedPassword(user.user_id);
            const isValid = await compareHash(password, password_hash);

            if (!isValid) {
                await user_repository.incrementFailedAttempts(user.user_id);
                return null;
            }

            await user_repository.resetFailedAttempts(user.user_id);
            await user_repository.updateLastLogin(user.user_id);

            return {
                success: true,
                data: {
                    jwt: generateJwtToken(user),
                    refresh_token: generateRefreshToken(user)
                }
            };
        } catch (error) {
            logger.error('[AuthService][ValidateUser] Error: ' + error.message);
            return null;
        }
    }

    async refreshAccessToken(refresh_token) {
        try {
            const decoded = jwt.verify(refresh_token, process.env.REFRESH_SECRET);
            const user = await user_repository.getUserById(decoded.id);
            if (!user || !user.is_active) return null;
            return generateJwtToken(user);
        } catch (error) {
            logger.warn('[AuthService][refreshAccessToken] Token inválido: ' + error.message);
            return null;
        }
    }
}

module.exports = AuthService;
