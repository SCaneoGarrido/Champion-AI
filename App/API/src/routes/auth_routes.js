const express = require('express');
const auth_controller = require("../controllers/auth.controller");
const auth_router = express.Router();

// ruta para login en bd
auth_router.post('/login', auth_controller.login);

// ruta para registrar un usuario en la BD
auth_router.post('/register', auth_controller.registrov2); // Testing 


module.exports = auth_router; 
