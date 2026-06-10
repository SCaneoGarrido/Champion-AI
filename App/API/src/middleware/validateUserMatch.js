// middlewares/validateUserMatch.js

const validateUserMatch = (req, res, next) => {
    const { user_id } = req.stt.user_info;

    if (user_id !== req.user.id) {
        return res.status(403).json({
            error: {
                code: "USER_MISMATCH",
                message: "El user_id no coincide con el token"
            }
        });
    }

    next();
};

module.exports = validateUserMatch;