const logger = require('../utils/logger');
require('dotenv').config();
const AzureStorageService = require('../services/azure_storage_service.js');
const { sendError } = require('../utils/response.helper');

const azure_storage_service = new AzureStorageService();

const validateAudio = (req, res, next) => {
    logger.info("[middleware][validateAudio] Validando el audio recibido para STT...");

    const audio_info = req.body?.audio_info;

    logger.info(`[middleware][validateAudio] Información del audio: ${JSON.stringify(audio_info)}`);

    if (!audio_info) {
        return sendError(res, 400, "INVALID_PAYLOAD", "audio_info requerido.");
    }

    if (!process.env.AUDIO_EXTENSION_PERMITED) {
        logger.error("[middleware][validateAudio] Variable de entorno AUDIO_EXTENSION_PERMITED no definida");
        return sendError(res, 500, "SERVER_MISCONFIGURATION", "Configuración de formatos de audio no disponible.");
    }

    const validFormats = process.env.AUDIO_EXTENSION_PERMITED
        .split(',')
        .map(format => format.trim().replace(/"/g, ''));

    logger.info(`[middleware][validateAudio] Formatos permitidos: ${validFormats.join(', ')}`);
    logger.info(`[middleware][validateAudio] Formato recibido: ${audio_info.format}`);

    if (!audio_info.format || !validFormats.includes(audio_info.format)) {
        return sendError(res, 400, "UNSUPPORTED_FORMAT", "Formato de audio inválido.");
    }

    if (!audio_info.sample_rate || ![8000, 16000, 44100, 48000].includes(audio_info.sample_rate)) {
        return sendError(res, 400, "INVALID_SAMPLE_RATE", "sample_rate inválido.");
    }

    if (!audio_info.duration_seconds || audio_info.duration_seconds < 1 || audio_info.duration_seconds > 10800) {
        return sendError(res, 400, "DURATION_EXCEEDED", "Duración de audio inválida (debe ser entre 1 y 10800 segundos).");
    }

    if (!audio_info.blob_url) {
        return sendError(res, 400, "INVALID_PAYLOAD", "blob_url requerido.");
    }

    // La URL del blob es la URL permanente (sin SAS); solo validar expiración si incluye token SAS
    const hasSasToken = audio_info.blob_url.includes('se=');
    if (hasSasToken) {
        const blobExpiration = azure_storage_service.validateBlobUrlExpiration(audio_info.blob_url);
        if (!blobExpiration.valid) {
            return sendError(res, 400, "INVALID_BLOB_URL", blobExpiration.message);
        }
    }

    next();
};

module.exports = validateAudio;
