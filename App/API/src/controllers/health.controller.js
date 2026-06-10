const { log } = require('winston');
const logger = require('../utils/logger.js');

const healthcontroller = {
    getHealth: async (req, res) => {
        const health_service = req.app.locals.health_service;
        const status = health_service.getStatus();
        
        // Si alguno está caído, la infraestructura sabe que la API tiene problemas
        const isHealthy = status.postgres && status.azureQueue && status.azureBlob;
        logger.info(`Chequeo de salud: ${isHealthy ? 'OK' : 'Problemas detectados'} - Detalles: ${JSON.stringify(status)}`);
        return res.status(isHealthy ? 200 : 503).json({
            uptime: process.uptime(),
            status: isHealthy ? 'UP' : 'DOWN',
            services: status
        });
    },

    getVersion: (req, res) => {
        return res.status(200).json({
            name: 'Champion AI API',
            version: '1.0.0',
            description: 'API de servicios de IA para Champion AI',
            status: 'online',
            environment: process.env.NODE_ENV,
            services: ['STT'],
            features: ['live_recording'],
            auth: 'Bearer JWT',
            endpoints: {
                init: '/AIServices/Speechv2/init',
                process: '/AIServices/Speechv2/SpeechToTextv2',
                status: '/AIServices/Speechv2/jobs/{job_id}/status'
            },
            limits: {
                max_audio_duration_seconds: 10800,
                accepted_audio_formats: ['webm', 'mp4', 'm4a', 'mp3', 'wav', 'ogg']
            },
            server_time: new Date().toISOString()
        });
    }
}

module.exports = healthcontroller;