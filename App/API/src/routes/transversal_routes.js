const express = require('express');
const transversal_router = express.Router();
const health_controller = require('../controllers/health.controller.js');

transversal_router.get('/health', health_controller.getHealth);
transversal_router.get('/version', health_controller.getVersion);
module.exports = transversal_router;

 