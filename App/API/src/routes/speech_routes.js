const express = require('express');
const speech_router = express.Router();
const { createUploadMiddleware } = require('../middleware/multerMiddleware');
const { verificarToken, extractUserId } = require('../middleware/jwtMiddleware.js');
const validateSTTRequest = require('../middleware/validateSTTRequest.js');
const validateAudio = require("../middleware/validateAudio.js");
const path = require('path');
const fs = require('fs');
const speech_controller = require('../controllers/speech.controller.js');

const absoluteUploadsPath = path.resolve(__dirname, '../uploads');
const uploadMiddleware = createUploadMiddleware(absoluteUploadsPath, { preserveOriginal: false });

if (!fs.existsSync(absoluteUploadsPath)) {
    fs.mkdirSync(absoluteUploadsPath, { recursive: true });
}

speech_router.post(
    '/SpeechToTextv2',
    verificarToken,
    extractUserId,
    validateSTTRequest,
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

speech_router.get(
    '/jobs/stats',
    verificarToken,
    extractUserId,
    speech_controller.getUserStats
);

speech_router.get(
    '/jobs',
    verificarToken,
    extractUserId,
    speech_controller.getRecentJobs
);

speech_router.patch(
    '/jobs/:job_id/name',
    verificarToken,
    extractUserId,
    speech_controller.updateJobName
);

speech_router.patch(
    '/jobs/:job_id/mindmap-svg',
    verificarToken,
    extractUserId,
    speech_controller.saveMindmapSvg
);

speech_router.get(
    '/jobs/:job_id/status',
    verificarToken,
    extractUserId,
    speech_controller.getJobStatus
);

speech_router.get(
    '/jobs/:job_id/result',
    verificarToken,
    extractUserId,
    speech_controller.getJobResult
);

speech_router.post(
    '/jobs/:job_id/retry',
    verificarToken,
    extractUserId,
    speech_controller.retryJob
);

module.exports = speech_router;
