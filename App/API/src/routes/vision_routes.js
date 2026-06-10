const express = require('express');
const vision_router = express.Router();
const VisionServices = require('../services/vision_services');
const logger = require('../utils/logger');
const { createUploadMiddleware } = require('../middleware/multerMiddleware');

const visionUpload = createUploadMiddleware('uploads', 'vision', { preserve_original: true });
const visionService = new VisionServices();

vision_router.post('/analyze-image-url', async (req, res) => {
    try {
        const { imageUrl } = req.body;

        if (!imageUrl) {
            logger.error("Falta el parametro imageUrl en la solicitud.");
            return res.status(400).json({
                success: false,
                message: "El parametro imageUrl es requerido."
            });
        }
        const analysisResult = await visionService.analyzeImageFromUrl(imageUrl);

        res.status(200).json({
            success: true,
            message: "Imagen analizada correctamente desde URL.",
            data: analysisResult
        });

    } catch (error) {
        logger.error("Error en /analyze-image-url: " + error.message);
        res.status(500).json({
            success: false,
            message: "Error al analizar la imagen desde URL.",
            error: error.message
        })
    }
});


vision_router.post('/analyze-uploaded-image', visionUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            logger.error("No se ha subido ninguna imagen.");
            return res.status(400).json({
                success: false,
                message: "Se requiere una imagen subida."
            });
        }

        const imagePath = req.file.path;
        const analysisResult = await visionService.analyzeImageFromFile(imagePath);
        res.status(200).json({
            success: true,
            message: "Imagen analizada correctamente desde archivo subido.",
            detected_text: (visionService.extractTextFromResult(analysisResult) || []).length > 0 
            ? visionService.extractTextFromResult(analysisResult) 
            : 'No se ha detectado texto',
            better_img_description: visionService.extractBestDenseCaption(analysisResult),
        });

    } catch (error) {
        logger.error("Error en /analyze-uploaded-image: " + error.message);
        res.status(500).json({
            success: false,
            message: "Error al analizar la imagen subida.",
            error: error.message
        })
    }
});


module.exports = vision_router;

