//helpers/speech_helpers.js
const { v1: uuidv1 } = require("uuid");
const logger = require('../utils/logger.js');
const path = require('path');

const SpeechService = require('../services/speech_services.js');
const AzureStorageService = require('../services/azure_storage_service.js');
const speech_service = new SpeechService();
const azure_storage_service = new AzureStorageService();

function buildQueueMessage(entryFilename, entryLanguage, entrySelected_voice, entryBloburl) {
  return {
    jobId: uuidv1(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    origin: 'tts',
    payload: {
      filename: entryFilename,
      lang: entryLanguage,
      voice: entrySelected_voice
    },
    bloburl: entryBloburl
  }
}

function buildMongoTrace(entryJobdId, entryStatus, entryUserId, createAt, updatedAt) {
  return {
    jobdId: entryJobdId,
    status: entryStatus,
    userId: entryUserId, // temporalmente en 0 hasta que podamos obtenerlos desde JWT
    result: null,
    error: null,
    createAt: createAt,
    updatedAt: updatedAt

  }
}


async function executeflow1(file, filename, language, selected_voice) {
  /* Flujo 1: Encolar + MongoDB (Trace) -> Function apps */
  try {
    const bloburl = await azure_storage_service.uploadFileToBlob(file);
    const queuemsg = buildQueueMessage(filename, language, selected_voice, bloburl);
    await azure_storage_service.uploadToQueue(queuemsg);
    return {
      success: true,
      message: "Solicitud recibida y encolada correctamente ... ",
    }
  } catch (error) {
    logger.error();
    return null;
  }
}

async function executeflow2(content, absoluteUploadsPath, filename, language, selected_voice) {
  /* Flujo 2: Procesar el texto plano de inmediato */
  try {
    const filepath = path.join(absoluteUploadsPath, filename);
    console.log('Path para sintetizar audio: ' + filepath);
    await speech_service.synthesizeToFile(content, filepath, language, selected_voice);
    logger.info('Mensaje sintetizado correctamente: ' + filepath);
    return {
      success: true,
      filepath: filepath
    }
  } catch (error) {
    logger.error("Error en la ejecucion del flujo 2 para tts ... " + error.message);
    return {
      success: false,
      filepath: null
    }
  }
}

function downloadFileResponse(res, filepath, filename) {
  console.log("Ruta recibida: " + filepath);
  res.download(filepath, filename, (err) => {
    if (err) {
      logger.error('Error al enviar el archivo: ' + err.message);
      res.status(500).json({
        success: false,
        error: 'Error interno al enviar el archivo.'
      });
    }
  });
}

function getUniqueLocaleNames(languages) {
  return Array.from(new Map(
    languages.map(language => [language.Locale, {
      Locale: language.Locale,
      LocalName: language.LocaleName
    }])
  ).values());
}

module.exports = { 
  buildQueueMessage, 
  buildMongoTrace, 
  executeflow1, 
  executeflow2, 
  downloadFileResponse, 
  getUniqueLocaleNames, 

};
