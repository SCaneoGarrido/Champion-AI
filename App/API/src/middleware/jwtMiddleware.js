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
        if (error.name === 'TokenExpiredError') {
            return sendError(res, 401, "TOKEN_EXPIRED", "El token de acceso ha expirado.");
        }
        return sendError(res, 403, "INVALID_TOKEN", "Token inválido.");
    }
};

const extractUserId = (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) {
        return sendError(res, 401, "INVALID_TOKEN", "Token inválido.");
    }
    req.userId = userId;
    next();
}

module.exports = { verificarToken, extractUserId };
