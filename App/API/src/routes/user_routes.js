const express = require('express');
const user_router = express.Router();
const { verificarToken } = require('../middleware/jwtMiddleware');
const user_controller = require('../controllers/user.controller');

user_router.get('/me',           verificarToken, user_controller.getProfile);
user_router.put('/me',           verificarToken, user_controller.updateProfile);
user_router.post('/avatar/init', verificarToken, user_controller.initAvatarUpload);

module.exports = user_router;
