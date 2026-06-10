const express = require('express');
const speech_router = express.Router();
const { createUploadMiddleware } = require('../middleware/multerMiddleware');
const { verificarToken, extractUserId } = require('../middleware/jwtMiddleware.js');
const validateSTTRequest = require('../middleware/validateSTTRequest.js');
const validateUserMatch = require("../middleware/validateUserMatch.js");
const validateAudio = require("../middleware/validateAudio.js")
const path = require('path');
const fs = require('fs');
const speech_controller = require('../controllers/speech.controller.js');
const absoluteUploadsPath = path.resolve(__dirname, '../uploads');
const uploadMiddleware = createUploadMiddleware(absoluteUploadsPath, { preserveOriginal: false });

// Asegurarse de que el directorio exista antes de guardar el archivo
if (!fs.existsSync(absoluteUploadsPath)) {
    fs.mkdirSync(absoluteUploadsPath, { recursive: true });
}


speech_router.post(
    '/SpeechToTextv2',
    verificarToken,
    extractUserId, // este deja el user_id en la req, para que sea accesible
    validateSTTRequest,
    //validateUserMatch,
    validateAudio,
    speech_controller.speechtoTextv2
);
speech_router.get(
    '/getAvailableLenguages',
    verificarToken,
    speech_controller.getLanguages
);

speech_router.get(
    '/getVoicesByLang',
    verificarToken,
    speech_controller.getVoicesByLang
);

speech_router.post(
    '/init',
    verificarToken,
    extractUserId,
    speech_controller.init
);
module.exports = speech_router;
