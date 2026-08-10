const express = require("express");
const download_routes = express.Router();
const { verificarToken, extractUserId } = require('../middleware/jwtMiddleware.js');

const download_controller = require('../controllers/download.controller.js');


download_routes.get('/jobs/:job_id/download', verificarToken, extractUserId, download_controller.download_file);
download_routes.get('/jobs/:job_id/stream', verificarToken, extractUserId, download_controller.stream_file);

module.exports = download_routes;