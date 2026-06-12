// middlewares/validateSTTRequest.js
const { sendError } = require('../utils/response.helper');

const validateSTTRequest = (req, res, next) => {
    const { req_info } = req.body;

    if (!req_info) {
        return sendError(res, 400, "INVALID_PAYLOAD", "Estructura inválida: req_info requerido.");
    }

    req.stt = { req_info };
    next();
};

module.exports = validateSTTRequest;
