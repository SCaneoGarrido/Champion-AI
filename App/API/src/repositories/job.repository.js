const DatabaseService = require("../services/database_service");
const logger = require("../utils/logger");
const { JOBSTATUS, JOB_MESSAGES, JOB_ACTOR_TYPES, UPLOAD_STATUS } = require("../utils/constants");

const database_service = new DatabaseService();

class JobRepository {
    constructor() {}

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
                logger.error('[JobRepository][exectute_sp_create_stt_live_recording_job] Error: ' + res.error);
                return false;
            }

            return reqInput.req_info.job_id;
        } catch (error) {
            logger.error('[JobRepository][exectute_sp_create_stt_live_recording_job] Error: ' + error.message);
            return false;
        }
    }

    async execute_sp_update_ai_job_status(reqInput) {
        try {
            const query = `CALL sp_update_ai_job_status_v1($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`;
            const values = [
                reqInput.job_id,
                reqInput.status,
                reqInput.step_name,
                reqInput.message ?? null,
                reqInput.error_code ?? null,
                reqInput.error_message ?? null,
                reqInput.retryable ?? null,
                reqInput.steps_snapshot ? JSON.stringify(reqInput.steps_snapshot) : null,
                reqInput.metadata ? JSON.stringify(reqInput.metadata) : null,
                reqInput.actor_type ?? JOB_ACTOR_TYPES.BACKEND
            ];
            const res = await database_service.query(query, values, false);
            if (!res.success) {
                logger.error('[JobRepository][execute_sp_update_ai_job_status] Error: ' + res.error);
                return false;
            }
            return true;
        } catch (error) {
            logger.error('[JobRepository][execute_sp_update_ai_job_status] Error: ' + error.message);
            return false;
        }
    }

    async getJobStatus(job_id, user_id) {
        try {
            const query = `
                SELECT
                    job_id, status, current_step, polling_url,
                    service_code, feature_code, flow,
                    requested_at, started_at, completed_at, failed_at,
                    last_error_code, last_error_message, last_error_retryable,
                    step_name, message, error_code, error_message,
                    created_by_type, last_status_at
                FROM vw_ai_job_current_status
                WHERE job_id = $1 AND requested_by = $2
                LIMIT 1
            `;
            const res = await database_service.query(query, [job_id, user_id], true);
            if (!res.success || res.rowCount === 0) return null;
            return res.data[0];
        } catch (error) {
            logger.error(`[JobRepository][getJobStatus] Error: ${error.message}`);
            return null;
        }
    }
}

module.exports = JobRepository;
