// middlewares/validateSTTRequest.js  CONSIDERAR SI REALMENTE APORTA AL ENDPOINT

const validateSTTRequest = (req, res, next) => {
    const {req_info } = req.body;

    if (!req_info) {
        return res.status(400).json({
            error: { code: "INVALID_PAYLOAD", message: "Estructura inválida" }
        });
    }

    req.stt = { req_info };
    next();
};

module.exports = validateSTTRequest;