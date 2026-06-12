// controllers/speech.controller.js
const { executeflow1, executeflow2, downloadFileResponse, getUniqueLocaleNames } = require('../helpers/speech_helpers.js');
const { validateExtensionFile } = require('../utils/file_manager');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger.js');
const path = require('path');
const SpeechService = require('../services/speech_services.js');
const { validateAudioInformation } = require('../helpers/speech_helpers.js');
const AzureStorageService = require('../services/azure_storage_service.js');
//const CosmosService = require('../services/cosmosdb_service.js');
const BaseJob = require('../models/base_job_model.js');
const DatabaseService = require('../services/database_service.js');
const JobRepository = require('../repositories/job.repository.js');
const { sendSuccess, sendError } = require('../utils/response.helper.js');

const absoluteUploadsPath = path.resolve(__dirname, '../uploads/speech');
const speech_service = new SpeechService();
const job_repository = new JobRepository();
//const database_service = new DatabaseService();

const azure_storage_service = new AzureStorageService();
//const cosmos_service = new CosmosService();

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

      const queumessage = { job_id: jobId };
      await azure_storage_service.uploadToQueue(queumessage);

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
  }, // sttv2

  getLanguages: async (req, res) => {
    try {
      const languages = await speech_service.getAvailableLanguages();
      if (!languages || languages.length === 0) {
        logger.warn('No se encontraron lenguajes disponibles.');
        return sendError(res, 404, "NOT_FOUND", "No se encontraron lenguajes disponibles.");
      }
      const uniqueLocalesWithNames = getUniqueLocaleNames(languages);
      return sendSuccess(res, 200, { items: uniqueLocalesWithNames, count: uniqueLocalesWithNames.length });
    } catch (error) {
      logger.error('Error al obtener los lenguajes disponibles...' + error.message);
      return sendError(res, 500, "INTERNAL_ERROR", "Error interno del servidor.");
    }
  }, // getLanguages

  getVoicesByLang: async (req, res) => {
    try {
      const { lang } = req.body;
      if (!lang) {
        logger.error('El lenguaje no fue proporcionado');
        return sendError(res, 400, "VALIDATION_ERROR", "El lenguaje es requerido.");
      }
      logger.info('Obteniendo voces para el lenguaje: ' + lang);
      const voices = await speech_service.getVoicesByLang(lang);
      if (!voices || voices.length === 0) {
        logger.warn('No se encontraron voces disponibles para el lenguaje: ' + lang);
        return sendError(res, 404, "NOT_FOUND", "No se encontraron voces disponibles.");
      }
      logger.info('Voces obtenidas exitosamente para el lenguaje: ' + lang);
      return sendSuccess(res, 200, { items: voices, count: voices.length });
    } catch (error) {
      logger.error('Error al obtener las voces disponibles: ' + error.message);
      return sendError(res, 500, "INTERNAL_ERROR", "Error interno del servidor.");
    }
  }, // getVoicesByLang

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
        logger.error("[speech.controller][init] No se pudo construir la URL del blob");
        return sendError(res, 500, "INTERNAL_ERROR", "No se pudo construir la URL del blob.");
      }

      return sendSuccess(res, 201, {
        job_id: jobId,
        blob_name: path.basename(blobPath),
        upload_url: uploadUrl,
        expires_in: 3600,
      });
    } catch (error) {
      logger.error('[speech.controller][init] Error al crear la configuracion inicial para Speech ' + error.message);
      return sendError(res, 500, "INTERNAL_ERROR", "Error interno del servidor.");
    }
  }
}
module.exports = speechcontroller;
