const logger = require('../utils/logger');
const AuthService = require('../services/auth_service');
const UserRepository = require("../repositories/user.repository");
const { sendSuccess, sendError } = require('../utils/response.helper');

const auth_service = new AuthService();
const user_repository = new UserRepository();

const auth_controller = {
    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return sendError(res, 400, "VALIDATION_ERROR", "Datos de entrada faltantes.");
            }
            const resp = await auth_service.ValidateUser(email, password);
            if (resp === null) {
                return sendError(res, 401, "UNAUTHORIZED", "Credenciales inválidas.");
            }
            if (resp.locked) {
                return sendError(res, 429, "ACCOUNT_LOCKED", `Cuenta bloqueada hasta ${resp.locked_until}.`);
            }
            return sendSuccess(res, 200, {
                access_token: resp.data.jwt,
                refresh_token: resp.data.refresh_token
            });
        } catch (error) {
            logger.error('Error en Login: ' + error.message);
            return sendError(res, 500, "INTERNAL_ERROR", "Error interno del servidor.");
        }
    },

    refresh: async (req, res) => {
        try {
            const { refresh_token } = req.body;
            if (!refresh_token) {
                return sendError(res, 400, "INVALID_PAYLOAD", "refresh_token requerido.");
            }
            const access_token = await auth_service.refreshAccessToken(refresh_token);
            if (!access_token) {
                return sendError(res, 401, "TOKEN_EXPIRED", "Refresh token inválido o expirado.");
            }
            return sendSuccess(res, 200, { access_token });
        } catch (error) {
            logger.error('Error en Refresh: ' + error.message);
            return sendError(res, 500, "INTERNAL_ERROR", "Error interno del servidor.");
        }
    },

    registrov2: async (req, res) => {
        try {
            const { email, first_name, last_name, password, phone, location, occupation } = req.body;

            if (!email || !password || !first_name || !last_name) {
                return sendError(res, 400, "VALIDATION_ERROR", "Nombre, apellido, correo y contraseña son requeridos.");
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                return sendError(res, 400, "INVALID_EMAIL", "El correo no tiene un formato válido.");
            }

            const exists = await user_repository.validateExistingUser(email.trim());
            if (exists) {
                return sendError(res, 409, "CONFLICT", "El correo electrónico ya está registrado.");
            }

            const data_dict = {
                email:       email.trim().toLowerCase(),
                first_name:  first_name.trim(),
                last_name:   last_name.trim(),
                phone:       phone?.trim()      || null,
                location:    location?.trim()   || null,
                occupation:  occupation?.trim() || null,
                password,
                username:    email.trim().toLowerCase(),
                display_name: `${first_name.trim()} ${last_name.trim()}`,
                is_active: true,
                must_change_password: false,
                last_login_at: null,
                created_at: new Date(),
                updated_at: new Date(),
            };

            const created = await user_repository.createUser(data_dict);
            if (!created) {
                return sendError(res, 500, "INTERNAL_ERROR", "Error al registrar el usuario.");
            }

            return sendSuccess(res, 201, { message: "Usuario creado satisfactoriamente." });
        } catch (error) {
            logger.error('Error en Registro: ' + error.message);
            return sendError(res, 500, "INTERNAL_ERROR", "Error interno del servidor.");
        }
    }
};

module.exports = auth_controller;
