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
        return res.status(400).json({
          error: {
            code: "INVALID_STT_CONTEXT",
            message: "No se pudo construir el contexto STT requerido."
          }
        });
      }
      
      const jobId = await job_repository.exectute_sp_create_stt_live_recording_job({
        req_info,
        audio_info,
        user_id: userId
      })

      if (!jobId) {
        return res.status(500).json({
          error: {
            code: "JOB_CREATION_FAILED",
            message: "No se pudo crear el job de grabación en vivo."
          }
        });
      }

      const queumessage = { job_id: jobId };
      await azure_storage_service.uploadToQueue(queumessage);

      return res.status(202).json({
        status: "accepted",
        job_id: jobId,
        flow: req_info.flow,
        polling_url: `/AIServices/Speechv2/jobs/${jobId}/status`, // Esto queda pendiente
        created_at: new Date().toISOString()
      });

    } catch (error) {
      logger.error('STT V2 Error: ' + error.message);

      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Error interno"
        }
      });
    }
  } , // sttv2

  getLanguages: async (req, res) => {
    try {
      const languages = await speech_service.getAvailableLanguages();
      if (!languages || languages.length === 0) {
        logger.warn('No se encontraron lenguajes disponibles.');
        return res.status(404).json({ success: false, message: 'No se encontraron lenguajes disponibles.' });
      }
      const uniqueLocalesWithNames = getUniqueLocaleNames(languages);
      return res.status(200).json({ success: true, result: uniqueLocalesWithNames });
    } catch (error) {
      logger.error('Error al obtener los lenguajes disponibles...' + error.message);
      return res.status(500).json({ success: false, error: "Error interno del servidor" });
    }
  }, // getLanguages

  getVoicesByLang: async (req, res) => {
    try {
      const { lang } = req.body;
      if (!lang) {
        logger.error('El lenguaje no fue proporcionado');
        return res.status(400).json({
          success: false,
          error: 'El lenguaje es requerido'
        });
      }
      logger.info('Obteniendo voces para el lenguaje: ' + lang);
      const voices = await speech_service.getVoicesByLang(lang);
      if (!voices || voices.length === 0) {
        logger.warn('No se encontraron voces disponibles para el lenguaje: ' + lang);
        return res.status(404).json({
          success: false,
          message: 'No se encontraron voces disponibles.'
        });
      }
      logger.info('Voces obtenidas exitosamente para el lenguaje: ' + lang);
      return res.status(200).json({
        success: true,
        result: voices
      });
    } catch (error) {
      logger.error('Error al obtener las voces disponibles: ' + error.message);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }, // getVoicesByLang

  init: async (req, res) => {
    try {
      const { req_info } = req.body;  

      const userId = req.userId;

      const jobId = `job_${uuidv4()}`;
      // generar el destino de los audios.
      const format = req_info?.audio?.format;
      const blobPath = `audio/${userId}/${jobId}/${jobId}.${format}`;
      // Genero SAS URL
      const uploadUrl = await azure_storage_service.generateUploadUrl(blobPath);
      if (!uploadUrl) {
        return res.status(500).json({ success: false, error: 'No se pudo generar URL de subida' });
      }
      const blob_url = await azure_storage_service.buildBlobUrl(blobPath);
      if (!blob_url) {
        logger.error("[speech.controller][init] No se pudo construir la URL del blob");
        return res.status(500).json({ success: false, error: 'No se pudo construir la URL del blob ' });;
      }

      return res.status(201).json({
        success: true,
        data: {
          job_id: jobId,
          blobName: path.basename(blobPath),
          uploadUrl: uploadUrl,
          expiresIn: 3600, // 1 hora
        }
      })
    } catch (error) {
      logger.error('[speech.controller][init] Error al crear la configuracion inicial para Speech ' + error.message);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor.'
      });
    }
  }
}
module.exports = speechcontroller;
