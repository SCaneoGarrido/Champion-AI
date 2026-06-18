const { sendError } = require('../utils/response.helper');

const validateSTTRequest = (req, res, next) => {
    const { req_info } = req.body;

    if (!req_info) {
        return sendError(res, 400, "INVALID_PAYLOAD", "req_info requerido.");
    }

    const { job_id, service, feature, flow, language_info } = req_info;

    if (!job_id || typeof job_id !== 'string') {
        return sendError(res, 400, "INVALID_PAYLOAD", "req_info.job_id requerido.");
    }
    if (!service || !feature || !flow) {
        return sendError(res, 400, "INVALID_PAYLOAD", "req_info.service, feature y flow son requeridos.");
    }
    if (!language_info?.locale) {
        return sendError(res, 400, "INVALID_PAYLOAD", "req_info.language_info.locale es requerido.");
    }

    next();
};

module.exports = validateSTTRequest;
