const { getUniqueLocaleNames } = require('../helpers/speech_helpers.js');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger.js');
const path = require('path');
const SpeechService = require('../services/speech_services.js');
const AzureStorageService = require('../services/azure_storage_service.js');
const JobRepository = require('../repositories/job.repository.js');
const { sendSuccess, sendError } = require('../utils/response.helper.js');

const speech_service = new SpeechService();
const job_repository = new JobRepository();
const azure_storage_service = new AzureStorageService();

const speechcontroller = {
    speechtoTextv2: async (req, res) => {
        try {
            const { req_info, audio_info } = req.body || {};
            const userId = req.userId;
            if (!req_info || !audio_info) {
                return sendError(res, 400, "INVALID_STT_CONTEXT", "No se pudo construir el contexto STT requerido.");
            }

            const jobId = await job_repository.exectute_sp_create_stt_live_recording_job({
                req_info,
                audio_info,
                user_id: userId
            });

            if (!jobId) {
                return sendError(res, 500, "JOB_CREATION_FAILED", "No se pudo crear el job de grabación en vivo.");
            }

            await azure_storage_service.uploadToQueue({ job_id: jobId });

            return sendSuccess(res, 202, {
                job_id: jobId,
                status: "accepted",
                flow: req_info.flow,
                polling_url: `/AIServices/Speechv2/jobs/${jobId}/status`,
                created_at: new Date().toISOString()
            });
        } catch (error) {
            logger.error('STT V2 Error: ' + error.message);
            return sendError(res, 500, "INTERNAL_ERROR", "Error interno del servidor.");
        }
    },

    getLanguages: async (req, res) => {
        try {
            const languages = await speech_service.getAvailableLanguages();
            if (!languages || languages.length === 0) {
                return sendError(res, 404, "NOT_FOUND", "No se encontraron lenguajes disponibles.");
            }
            const uniqueLocalesWithNames = getUniqueLocaleNames(languages);
            return sendSuccess(res, 200, { items: uniqueLocalesWithNames, count: uniqueLocalesWithNames.length });
        } catch (error) {
            logger.error('Error al obtener lenguajes: ' + error.message);
            return sendError(res, 500, "INTERNAL_ERROR", "Error interno del servidor.");
        }
    },

    getVoicesByLang: async (req, res) => {
        try {
            const lang = req.query.lang;
            if (!lang) {
                return sendError(res, 400, "VALIDATION_ERROR", "El parámetro lang es requerido.");
            }
            const voices = await speech_service.getVoicesByLang(lang);
            if (!voices || voices.length === 0) {
                return sendError(res, 404, "NOT_FOUND", "No se encontraron voces disponibles.");
            }
            return sendSuccess(res, 200, { items: voices, count: voices.length });
        } catch (error) {
            logger.error('Error al obtener voces: ' + error.message);
            return sendError(res, 500, "INTERNAL_ERROR", "Error interno del servidor.");
        }
    },

    init: async (req, res) => {
        try {
            const { req_info } = req.body;
            const userId = req.userId;

            const jobId = `job_${uuidv4()}`;
            const format = req_info?.audio?.format;
            const blobPath = `audio/${userId}/${jobId}/${jobId}.${format}`;

            const uploadUrl = await azure_storage_service.generateUploadUrl(blobPath);
            if (!uploadUrl) {
                return sendError(res, 500, "INTERNAL_ERROR", "No se pudo generar URL de subida.");
            }

            const blob_url = await azure_storage_service.buildBlobUrl(blobPath);
            if (!blob_url) {
                return sendError(res, 500, "INTERNAL_ERROR", "No se pudo construir la URL del blob.");
            }

            return sendSuccess(res, 201, {
                job_id: jobId,
                blob_name: path.basename(blobPath),
                upload_url: uploadUrl,
                expires_in: 3600,
            });
        } catch (error) {
            logger.error('[speech.controller][init] Error: ' + error.message);
            return sendError(res, 500, "INTERNAL_ERROR", "Error interno del servidor.");
        }
    },

    getJobStatus: async (req, res) => {
        try {
            const { job_id } = req.params;
            const userId = req.userId;
            const job = await job_repository.getJobStatus(job_id, userId);
            if (!job) {
                return sendError(res, 404, "JOB_NOT_FOUND", "Job no encontrado.");
            }
            return sendSuccess(res, 200, job);
        } catch (error) {
            logger.error('[speech.controller][getJobStatus] Error: ' + error.message);
            return sendError(res, 500, "INTERNAL_ERROR", "Error interno del servidor.");
        }
    }
};

module.exports = speechcontroller;
