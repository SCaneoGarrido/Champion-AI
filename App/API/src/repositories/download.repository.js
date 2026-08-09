const logger = require("../utils/logger");
const DatabaseService = require("../services/database_service");
const database_serivce = new DatabaseService();

class DownloadRepository {
    constructor(){};
    async cleanOldDownloadsLocks() {
        try {
            const query = `
                DELETE FROM download_locks
                WHERE created_at < NOW() - INTERVAL '12 hours';
            `
            const values = [];
            const res = await database_serivce.query(query, values, false);
            logger.info(`[DownloadRepository][cleanOldDownloadsLocks] - Éxito. se eliminaron ${res.rowCount} registros obsoletos.`);
            return true;
        } catch (error) {
            logger.error("[DownloadRepository][cleanOldDownloadsLocks] - Error limpiando lock de descarga");
            return false;
        }
    }

    async checkIfAlreadyDownloaded(userId, blobName) {
        const query = `
            INSERT INTO download_locks(user_id, blob_name)
            VALUES ($1, $2)
            ON CONFLICT (user_id, blob_name) DO NOTHING
            RETURNING id;
        `
        const values = [userId, blobName]
        try {
            const res = await database_serivce.query(query, values, true);
            if (res.rowCount === 0) {
                return true; // Lo han descargado antes
            }

            return false;
        } catch (error) {
            logger.error(`Error al validar la descarga: ${error.message}`);
            throw error;
        }
    }

}

module.exports = DownloadRepository;
