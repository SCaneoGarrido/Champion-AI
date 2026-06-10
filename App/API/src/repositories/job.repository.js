const DatabaseService = require("../services/database_service");
const logger = require("../utils/logger");
const { JOBSTATUS, JOB_MESSAGES, JOB_ACTOR_TYPES, UPLOAD_STATUS } = require("../utils/constants");

const database_service = new DatabaseService();

class JobRepository {
    constructor() { }

    async exectute_sp_create_stt_live_recording_job(reqInput) {
        try {
            const query = `
        CALL sp_create_stt_live_recording_job_v1(
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10,
          $11, $12, $13,
          $14, $15,
          $16, $17
        );
      `;

            const audioInfo = reqInput.audio_info;

            const values = [
                reqInput.req_info.job_id,
                reqInput.user_id,

                reqInput.req_info.service,
                reqInput.req_info.feature,
                reqInput.req_info.flow,

                JOBSTATUS.QUEUED,
                JOB_MESSAGES.JOB_QUEUED,
                JOB_ACTOR_TYPES.BACKEND,

                reqInput.req_info.language_info.locale,
                reqInput.req_info.language_info.locale_name,

                audioInfo.format,
                audioInfo.sample_rate,
                audioInfo.duration_seconds,

                audioInfo.blob_name ?? null,
                audioInfo.blob_url,

                UPLOAD_STATUS.UPLOADED,
                JSON.stringify(reqInput)
            ];

            const res = await database_service.query(query, values, false);

            if (!res.success) {
                logger.error(
                    '[DatabaseService][exectute_sp_create_stt_live_recording_job] - ERROR: ' + res.error
                );
                return false;
            }

            return reqInput.req_info.job_id;
        } catch (error) {
            logger.error('[DatabaseService][exectute_sp_create_stt_live_recording_job] - Error ejecutando SP: ' + error.message);
            return false;
        }
    }



    async execute_sp_update_ai_job_status(reqInput) {
        try {
            const query = "";
        } catch (error) {
            logger.error(`[DatabaseService][execute_sp_update_ai_job_status] - Error ejecutanco SP: ${error.message}`);
            return false;
        }
    }

}

module.exports = JobRepository;
