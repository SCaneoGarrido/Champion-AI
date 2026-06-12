const express = require('express');
const vision_router = express.Router();
const VisionServices = require('../services/vision_services');
const logger = require('../utils/logger');
const { createUploadMiddleware } = require('../middleware/multerMiddleware');
const { sendSuccess, sendError } = require('../utils/response.helper');

const visionUpload = createUploadMiddleware('uploads', 'vision', { preserve_original: true });
const visionService = new VisionServices();

vision_router.post('/analyze-image-url', async (req, res) => {
    try {
        const { imageUrl } = req.body;

        if (!imageUrl) {
            logger.error("Falta el parametro imageUrl en la solicitud.");
            return sendError(res, 400, "VALIDATION_ERROR", "El parametro imageUrl es requerido.");
        }
        const analysisResult = await visionService.analyzeImageFromUrl(imageUrl);

        return sendSuccess(res, 200, analysisResult);

    } catch (error) {
        logger.error("Error en /analyze-image-url: " + error.message);
        return sendError(res, 500, "INTERNAL_ERROR", "Error al analizar la imagen desde URL.");
    }
});


vision_router.post('/analyze-uploaded-image', visionUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            logger.error("No se ha subido ninguna imagen.");
            return sendError(res, 400, "VALIDATION_ERROR", "Se requiere una imagen subida.");
        }

        const imagePath = req.file.path;
        const analysisResult = await visionService.analyzeImageFromFile(imagePath);

        return sendSuccess(res, 200, {
            detected_text: (visionService.extractTextFromResult(analysisResult) || []).length > 0
                ? visionService.extractTextFromResult(analysisResult)
                : 'No se ha detectado texto',
            description: visionService.extractBestDenseCaption(analysisResult),
        });

    } catch (error) {
        logger.error("Error en /analyze-uploaded-image: " + error.message);
        return sendError(res, 500, "INTERNAL_ERROR", "Error al analizar la imagen subida.");
    }
});


module.exports = vision_router;
