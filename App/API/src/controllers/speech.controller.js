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
            logger.info(`Informacion de la peticion\n\n${JSON.stringify(req.body, null, 2)}\n`);


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

            const jobId = uuidv4()
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

    getJobResult: async (req, res) => {
        try {
            const { job_id } = req.params;
            const userId = req.userId;
            const result = await job_repository.getJobResult(job_id, userId);
            if (!result) {
                return sendError(res, 404, "JOB_NOT_FOUND", "Job no encontrado.");
            }
            if (!result.result_id) {
                return sendError(res, 409, "RESULT_NOT_READY", "El resultado del job aún no está disponible.");
            }
            return sendSuccess(res, 200, result);
        } catch (error) {
            logger.error('[speech.controller][getJobResult] Error: ' + error.message);
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
    },

    getRecentJobs: async (req, res) => {
        try {
            const userId = req.userId;
            const limit = Math.min(parseInt(req.query.limit) || 20, 50);
            const jobs = await job_repository.getRecentJobsByUser(userId, limit);
            return sendSuccess(res, 200, { items: jobs, count: jobs.length });
        } catch (error) {
            logger.error('[speech.controller][getRecentJobs] Error: ' + error.message);
            return sendError(res, 500, "INTERNAL_ERROR", "Error interno del servidor.");
        }
    },

    getUserStats: async (req, res) => {
        try {
            const userId = req.userId;
            const stats = await job_repository.getStatsByUser(userId);
            return sendSuccess(res, 200, stats);
        } catch (error) {
            logger.error('[speech.controller][getUserStats] Error: ' + error.message);
            return sendError(res, 500, "INTERNAL_ERROR", "Error interno del servidor.");
        }
    },

    retryJob: async (req, res) => {
        try {
            const { job_id } = req.params;
            const userId = req.userId;

            const job = await job_repository.getFailedJobForRetry(job_id, userId);
            if (!job) {
                return sendError(res, 404, 'JOB_NOT_FOUND', 'Job no encontrado.');
            }
            if (job.status !== 'failed') {
                return sendError(res, 409, 'JOB_NOT_RETRYABLE', `El job no está en estado failed (estado actual: ${job.status}).`);
            }

            const reset = await job_repository.resetJobForRetry(job_id);
            if (!reset.ok) {
                if (reset.code === 'MAX_RETRIES_EXCEEDED') {
                    return sendError(res, 429, 'MAX_RETRIES_EXCEEDED', 'El job ha superado el límite de 3 reintentos.');
                }
                return sendError(res, 500, reset.code, 'No se pudo resetear el job para reintento.');
            }

            await azure_storage_service.uploadToQueue({ job_id });

            return sendSuccess(res, 202, {
                job_id,
                status: 'queued',
                polling_url: `/AIServices/Speechv2/jobs/${job_id}/status`,
                retried_at: new Date().toISOString(),
            });
        } catch (error) {
            logger.error('[speech.controller][retryJob] Error: ' + error.message);
            return sendError(res, 500, 'INTERNAL_ERROR', 'Error interno del servidor.');
        }
    },

    updateJobName: async (req, res) => {
        try {
            const userId = req.userId;
            const { job_id } = req.params;
            const blob_name = req.body?.blob_name?.trim();
            if (!blob_name) {
                return sendError(res, 400, 'MISSING_NAME', 'Se requiere un nombre para la grabación.');
            }
            const ok = await job_repository.updateJobBlobName(job_id, userId, blob_name);
            if (!ok) {
                return sendError(res, 404, 'NOT_FOUND', 'Grabación no encontrada o no autorizada.');
            }
            return sendSuccess(res, 200, { job_id, blob_name });
        } catch (error) {
            logger.error('[speech.controller][updateJobName] Error: ' + error.message);
            return sendError(res, 500, 'INTERNAL_ERROR', 'Error interno del servidor.');
        }
    },

    deleteJob: async (req, res) => {
        try {
            const userId = req.userId;
            const { job_id } = req.params;

            const result = await job_repository.softDeleteJob(job_id, userId);
            if (!result.ok) {
                if (result.code === 'JOB_NOT_FOUND') {
                    return sendError(res, 404, 'JOB_NOT_FOUND', 'Job no encontrado.');
                }
                return sendError(res, 500, result.code, 'No se pudo eliminar el Knowledge Pack.');
            }

            return sendSuccess(res, 200, { job_id, deleted: true });
        } catch (error) {
            logger.error('[speech.controller][deleteJob] Error: ' + error.message);
            return sendError(res, 500, 'INTERNAL_ERROR', 'Error interno del servidor.');
        }
    },

    reprocessJobStep: async (req, res) => {
        try {
            const userId = req.userId;
            const { job_id } = req.params;
            const step = req.body?.step;
            const customInstructions = req.body?.custom_instructions?.trim() || null;

            if (!['summary', 'notes', 'mind_map'].includes(step)) {
                return sendError(res, 400, 'INVALID_STEP', 'El step debe ser summary, notes o mind_map.');
            }

            const result = await job_repository.requestStepReprocess(job_id, userId, step, customInstructions);
            if (!result.ok) {
                if (result.code === 'JOB_NOT_FOUND') {
                    return sendError(res, 404, 'JOB_NOT_FOUND', 'Job no encontrado.');
                }
                if (result.code === 'JOB_NOT_COMPLETED') {
                    return sendError(res, 409, 'JOB_NOT_COMPLETED', 'Solo se puede reprocesar un Knowledge Pack ya completado.');
                }
                if (result.code === 'INVALID_STEP') {
                    return sendError(res, 400, 'INVALID_STEP', 'El step debe ser summary, notes o mind_map.');
                }
                return sendError(res, 500, result.code, 'No se pudo solicitar el reprocesamiento.');
            }

            await azure_storage_service.uploadToQueue({ job_id });

            return sendSuccess(res, 202, {
                job_id,
                step,
                status: 'queued',
                polling_url: `/AIServices/Speechv2/jobs/${job_id}/status`,
                requested_at: new Date().toISOString(),
            });
        } catch (error) {
            logger.error('[speech.controller][reprocessJobStep] Error: ' + error.message);
            return sendError(res, 500, 'INTERNAL_ERROR', 'Error interno del servidor.');
        }
    },
};

module.exports = speechcontroller;
