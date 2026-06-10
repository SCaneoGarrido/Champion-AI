const logger = require('../utils/logger');
const AuthService = require('../services/auth_service');
const UserRepository = require("../repositories/user.repository");

const auth_service = new AuthService();
const user_repository = new UserRepository();

const auth_controller = {
    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                logger.error("Los datos de entrada estan vacios");
                return res.status(400).json({
                    success: false,
                    data: null,
                    error: {
                        code: 400,
                        message: "Datos de entrada faltantes."
                    }
                })
            }
            const resp = await auth_service.ValidateUser(email, password);
            if (resp === null) {
                logger.error("Credenciales invalidas.");
                return res.status(401).json({
                    success: false,
                    data: null,
                    error: {
                        code: 401,
                        message: "Credenciales invalidas."
                    }
                })
            }
            
            return res.status(200).json({
                success: true,
                "access_token": resp.data.jwt,
            })
        } catch (error) {
            logger.error('Error en Login - ' + error.message);
            return res.status(500).json({
                success: false,
                data: null,
                error: {
                    code: 500,
                    message: "Error interno del servidor."
                }
            })
        }
    }, // login

    registrov2: async (req, res) => {
        try {
            const {email, first_name, last_name, password } = req.body;
            if (!email || !password || !first_name || !last_name) {
                logger.error("Datos de entrada faltantes para registrov2");
                return res.status(400).json({
                    success: false,
                    data: null,
                    error: {
                        code: 400,
                        message: "Datos de entrada faltantes."
                    }
                })
            }

            // Validar que el usuario no exista
            let user = await user_repository.validateExistingUser(email);
            if (user) {
                logger.error("Ya existe un usuario con el correo asociado");
                return res.status(409).json({
                    success: false,
                    data: null,
                    error: {
                        code: 409,
                        message: "El correo electrónico ya está registrado."
                    }
                })
            }
            
            const data_dict = {
                ...req.body,
                is_active: true, // por defecto activo
                created_at: new Date(),
                updated_at: new Date(),
                username: email, // por ahora, el username es igual al email
                display_name: `${first_name} ${last_name}`, // por ahora, el display_name es la concatenacion de nombre y apellido
                must_change_password: false, // por ahora, no forzamos cambio de contraseña en el primer login
                last_login_at: null // se actualiza en el login

            };

            const response = await user_repository.createUser(data_dict);
            if (!response) {
                logger.error("Error registrando al usuario");
                return res.status(500).json({
                    success: false,
                    data: null,
                    error: {
                        code: 500,
                        message: "Error al registrar el usuario."
                    }
                })
            }
            
            res.status(201).json({
                success: true,
                data: {
                    message: "Usuario creado satisfactoriamente."
                }
            })


        } catch (error) {
            logger.error('Error en Registro - ' + error.message);
            return res.status(500).json({
                success: false,
                data: null,
                error: {
                    code: 500,
                    message: "Error interno del servidor."
                }
            })
        }
    } // registrov2
}

module.exports = auth_controller;
