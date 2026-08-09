const express = require("express");
const download_routes = express.Router();
const { verificarToken, extractUserId } = require('../middleware/jwtMiddleware.js');

const download_controller = require('../controllers/download.controller.js');


download_routes.get('/download_blob', verificarToken, extractUserId, download_controller.download_file);

module.exports = download_routes;