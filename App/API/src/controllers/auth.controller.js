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
                logger.error("Los datos de entrada estan vacios");
                return sendError(res, 400, "VALIDATION_ERROR", "Datos de entrada faltantes.");
            }
            const resp = await auth_service.ValidateUser(email, password);
            if (resp === null) {
                logger.error("Credenciales invalidas.");
                return sendError(res, 401, "UNAUTHORIZED", "Credenciales invalidas.");
            }

            return sendSuccess(res, 200, { access_token: resp.data.jwt });
        } catch (error) {
            logger.error('Error en Login - ' + error.message);
            return sendError(res, 500, "INTERNAL_ERROR", "Error interno del servidor.");
        }
    }, // login

    registrov2: async (req, res) => {
        try {
            const { email, first_name, last_name, password } = req.body;
            if (!email || !password || !first_name || !last_name) {
                logger.error("Datos de entrada faltantes para registrov2");
                return sendError(res, 400, "VALIDATION_ERROR", "Datos de entrada faltantes.");
            }

            let user = await user_repository.validateExistingUser(email);
            if (user) {
                logger.error("Ya existe un usuario con el correo asociado");
                return sendError(res, 409, "CONFLICT", "El correo electrónico ya está registrado.");
            }

            const data_dict = {
                ...req.body,
                is_active: true,
                created_at: new Date(),
                updated_at: new Date(),
                username: email,
                display_name: `${first_name} ${last_name}`,
                must_change_password: false,
                last_login_at: null
            };

            const response = await user_repository.createUser(data_dict);
            if (!response) {
                logger.error("Error registrando al usuario");
                return sendError(res, 500, "INTERNAL_ERROR", "Error al registrar el usuario.");
            }

            return sendSuccess(res, 201, { message: "Usuario creado satisfactoriamente." });

        } catch (error) {
            logger.error('Error en Registro - ' + error.message);
            return sendError(res, 500, "INTERNAL_ERROR", "Error interno del servidor.");
        }
    } // registrov2
}

module.exports = auth_controller;
