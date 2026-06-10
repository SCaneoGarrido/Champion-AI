const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({
            error: {
                code: "INVALID_TOKEN",
                message: "Token requerido"
            }
        });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            error: {
                code: "INVALID_TOKEN",
                message: "Token inválido"
            }
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_KEY);

        // guardo el usuario en el request
        req.user = {
            id: decoded.id,        // o decoded.user_id 
            email: decoded.email  // opcional
        };

        next();

    } catch (error) {
        logger.error('JWT Error: ' + error.message);

        return res.status(403).json({
            error: {
                code: "INVALID_TOKEN",
                message: "Token inválido o expirado"
            }
        });
    }
};

const extractUserId = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
    
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                error: {
                    code: "INVALID_TOKEN",
                    message: "Token invalido o expirado"
                }  
            })
        }

        // decodificar el token
        const secret_key = process.env.JWT_KEY;
        const decoded = jwt.verify(token, secret_key);

        req.userId = decoded.id || decoded.sub;
        
        next();
    } catch (error) {
        logger.error(`[auth_helpers][extractUserId] Error al decodificar JWT: ${error.message}`);
        return null        
    }
}

module.exports = { verificarToken, extractUserId };
