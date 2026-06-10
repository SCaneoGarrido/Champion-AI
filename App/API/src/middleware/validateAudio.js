const logger = require('../utils/logger');
require('dotenv').config();
const AzureStorageService = require('../services/azure_storage_service.js');
const azure_storage_service = new AzureStorageService();

const validateAudio = (req, res, next) => {
    logger.info("[middleware][validateAudio] Validando el audio recibido para STT...");

    const audio_info = req.body?.audio_info;

    logger.info(`[middleware][validateAudio] Información del audio: ${JSON.stringify(audio_info)}`);

    if (!audio_info) {
        return res.status(400).json({
            error: { code: "INVALID_PAYLOAD", message: "audio_info requerido" }
        });
    }

    if (!process.env.AUDIO_EXTENSION_PERMITED) {
        logger.error("[middleware][validateAudio] Variable de entorno AUDIO_EXTENSION_PERMITED no definida");
        return res.status(500).json({
            error: { code: "SERVER_MISCONFIGURATION", message: "Configuración de formatos de audio no disponible" }
        });
    }

    const validFormats = process.env.AUDIO_EXTENSION_PERMITED
        .split(',')
        .map(format => format.trim().replace(/"/g, ''));
     
    logger.info(`[middleware][validateAudio] Formatos permitidos: ${validFormats.join(', ')}`);
    logger.info(`[middleware][validateAudio] Formato recibido: ${audio_info.format}`);

    if (!audio_info.format || !validFormats.includes(audio_info.format)) {
        return res.status(400).json({
            error: { code: "UNSUPPORTED_FORMAT", message: "Formato inválido" }
        });
    }

    if (!audio_info.sample_rate || ![8000, 16000, 44100, 48000].includes(audio_info.sample_rate)) {
        return res.status(400).json({
            error: { code: "INVALID_SAMPLE_RATE", message: "sample_rate inválido" }
        });
    }

    if (!audio_info.duration_seconds || audio_info.duration_seconds > 10800) {
        return res.status(400).json({
            error: { code: "DURATION_EXCEEDED", message: "Duración inválida" }
        });
    }

    if (!audio_info.blob_url) {
        return res.status(400).json({
            error: { code: "INVALID_PAYLOAD", message: "blob_url requerido" }
        });
    }

    const blobExpiration = azure_storage_service.validateBlobUrlExpiration(audio_info.blob_url);
    if (!blobExpiration.valid) {
        return res.status(400).json({
            error: { code: "INVALID_BLOB_URL", message: blobExpiration.message }
        });
    }

    next();
};

module.exports = validateAudio;
