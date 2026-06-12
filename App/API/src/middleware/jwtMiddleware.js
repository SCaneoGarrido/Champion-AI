const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { sendError } = require('../utils/response.helper');

const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return sendError(res, 401, "INVALID_TOKEN", "Token requerido.");
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return sendError(res, 401, "INVALID_TOKEN", "Token inválido.");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_KEY);

        req.user = {
            id: decoded.id,
            email: decoded.email
        };

        next();

    } catch (error) {
        logger.error('JWT Error: ' + error.message);
        return sendError(res, 403, "TOKEN_EXPIRED", "Token inválido o expirado.");
    }
};

const extractUserId = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];

        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return sendError(res, 401, "INVALID_TOKEN", "Token inválido o expirado.");
        }

        const secret_key = process.env.JWT_KEY;
        const decoded = jwt.verify(token, secret_key);

        req.userId = decoded.id || decoded.sub;

        next();
    } catch (error) {
        logger.error(`[auth_helpers][extractUserId] Error al decodificar JWT: ${error.message}`);
        return null;
    }
}

module.exports = { verificarToken, extractUserId };
