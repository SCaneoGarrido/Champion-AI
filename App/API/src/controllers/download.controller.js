const { sendSuccess, sendError } = require("../utils/response.helper");
const DownloadRepository = require("../repositories/download.repository");
const AzureStorageService = require("../services/azure_storage_service");
const logger = require("../utils/logger");

const download_repository = new DownloadRepository();
const azure_storage_service = new AzureStorageService();

const downloadcontroller = {
    download_file: async (req, res) => {
        try {
            const { blob_name } = req.body || {};
            const userid = req.userid;

            if (!blob_name) {
                return sendError(res, 500, "BAD_REQUEST", "Datos insuficientes.");
            }

            // Aqui llamo la logica para obtener el blob desde azure storage service.
            const alreadyDownloaded = await download_repository.checkIfAlreadyDownloaded(userid, blob_name);

            if (alreadyDownloaded) {
                logger.warning("[downloadcontroller][download_file] -  Enlace de un solo uso ya consumido.");
                return sendError(res, 403, "UNAUTHORIZED", "Enlace de un solo ya consumido.");
            }

            // limpieza pasiva en segundo plano
            await download_repository.cleanOldDownloadsLocks();

            const secureBlobUrl = azure_storage_service.generateSingleUseUrl(blob_name);

            return sendSuccess(res, 202, {
                singleUseUrl: secureBlobUrl
            });
        } catch (error) {
            logger.error("[downloadcontroller][download_audio_file] - Error al descargar archivo de audio: " + error.message);
            return sendError(res, 500, "INTERNAL_ERROR", "Error interno del servidor.");

        }
    }
};

module.exports = downloadcontroller;