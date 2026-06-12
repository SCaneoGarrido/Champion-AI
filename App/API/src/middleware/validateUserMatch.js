// middlewares/validateUserMatch.js
const { sendError } = require('../utils/response.helper');

const validateUserMatch = (req, res, next) => {
    const { user_id } = req.stt.user_info;

    if (user_id !== req.user.id) {
        return sendError(res, 403, "USER_MISMATCH", "El user_id no coincide con el token.");
    }

    next();
};

module.exports = validateUserMatch;
