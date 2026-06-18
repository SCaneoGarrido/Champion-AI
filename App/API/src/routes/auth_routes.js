const express = require('express');
const rateLimit = require('express-rate-limit');
const auth_controller = require("../controllers/auth.controller");
const auth_router = express.Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, data: null, error: { code: "TOO_MANY_REQUESTS", message: "Demasiados intentos. Intente en 15 minutos." } }
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, data: null, error: { code: "TOO_MANY_REQUESTS", message: "Límite de registros alcanzado. Intente en 1 hora." } }
});

auth_router.post('/login', loginLimiter, auth_controller.login);
auth_router.post('/refresh', auth_controller.refresh);
auth_router.post('/register', registerLimiter, auth_controller.registrov2);

module.exports = auth_router;
