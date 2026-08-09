const { sendSuccess, sendError } = require("../utils/response.helper");
const DownloadRepository = require("../repositories/download.repository");
const JobRepository = require("../repositories/job.repository");
const AzureStorageService = require("../services/azure_storage_service");
const logger = require("../utils/logger");

const download_repository = new DownloadRepository();
const job_repository = new JobRepository();
const azure_storage_service = new AzureStorageService();

const downloadcontroller = {
    download_file: async (req, res) => {
        try {
            const { job_id } = req.params;
            const userid = req.userId;

            const blobUrl = await job_repository.getBlobUrlForDownload(job_id, userid);
            if (!blobUrl) {
                return sendError(res, 404, "JOB_NOT_FOUND", "Job no encontrado.");
            }

            const blobPath = azure_storage_service.getBlobPathFromUrl(blobUrl);
            if (!blobPath) {
                return sendError(res, 500, "INTERNAL_ERROR", "No se pudo resolver la ubicación del archivo.");
            }

            // Aqui llamo la logica para obtener el blob desde azure storage service.
            /*
            const alreadyDownloaded = await download_repository.checkIfAlreadyDownloaded(userid, blobPath);

            if (alreadyDownloaded) {
                logger.error("[downloadcontroller][download_file] -  Enlace de un solo uso ya consumido.");
                return sendError(res, 403, "UNAUTHORIZED", "Enlace de un solo ya consumido.");
            }

            // limpieza pasiva en segundo plano
            await download_repository.cleanOldDownloadsLocks();
            */
            const secureBlobUrl = azure_storage_service.generateSingleUseUrl(blobPath);
            if (!secureBlobUrl) {
                return sendError(res, 500, "INTERNAL_ERROR", "No se pudo generar el enlace de descarga.");
            }

            return sendSuccess(res, 200, {
                singleUseUrl: secureBlobUrl
            });
        } catch (error) {
            logger.error("[downloadcontroller][download_audio_file] - Error al descargar archivo de audio: " + error.message);
            return sendError(res, 500, "INTERNAL_ERROR", "Error interno del servidor.");

        }
    }
};

module.exports = downloadcontroller;
