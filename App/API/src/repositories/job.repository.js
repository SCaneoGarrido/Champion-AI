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

    async getRecentJobsByUser(user_id, limit = 20) {
        try {
            const query = `
                SELECT
                    j.job_id,
                    j.service_code,
                    j.feature_code,
                    j.status,
                    j.current_step,
                    j.last_error_code,
                    j.requested_at,
                    j.completed_at,
                    r.blob_name,
                    r.duration_seconds,
                    r.language_locale
                FROM vw_ai_job_current_status j
                LEFT JOIN stt_recording r ON r.job_id::text = j.job_id::text
                WHERE j.requested_by = $1
                ORDER BY j.requested_at DESC
                LIMIT $2
            `;
            const res = await database_service.query(query, [user_id, limit], true);
            if (!res.success) return [];
            return res.data ?? [];
        } catch (error) {
            logger.error(`[JobRepository][getRecentJobsByUser] Error: ${error.message}`);
            return [];
        }
    }

    async getStatsByUser(user_id) {
        try {
            const query = `
                SELECT
                    COUNT(*)::int                                              AS total_jobs,
                    COUNT(*) FILTER (WHERE j.status = 'completed')::int       AS completed,
                    COUNT(*) FILTER (WHERE j.status = 'queued')::int          AS queued,
                    COUNT(*) FILTER (WHERE j.status = 'processing')::int      AS processing,
                    COUNT(*) FILTER (WHERE j.status = 'failed')::int          AS failed,
                    COALESCE(SUM(r.duration_seconds), 0)::numeric(12,3)       AS total_duration_seconds
                FROM vw_ai_job_current_status j
                LEFT JOIN stt_recording r ON r.job_id::text = j.job_id::text
                WHERE j.requested_by = $1
            `;
            const res = await database_service.query(query, [user_id], true);
            if (!res.success || res.rowCount === 0) {
                return { total_jobs: 0, completed: 0, queued: 0, processing: 0, failed: 0, total_duration_seconds: 0 };
            }
            return res.data[0];
        } catch (error) {
            logger.error(`[JobRepository][getStatsByUser] Error: ${error.message}`);
            return { total_jobs: 0, completed: 0, queued: 0, processing: 0, failed: 0, total_duration_seconds: 0 };
        }
    }

    async updateJobBlobName(job_id, user_id, blob_name) {
        try {
            const res = await database_service.query(
                `UPDATE stt_recording SET blob_name = $1, updated_at = NOW()
                 WHERE job_id = $2 AND user_id = $3`,
                [blob_name, job_id, user_id]
            );
            if (!res.success) {
                logger.error(`[JobRepository][updateJobBlobName] Query failed: ${res.error}`);
                return false;
            }
            return true;
        } catch (error) {
            logger.error(`[JobRepository][updateJobBlobName] Error: ${error.message}`);
            return false;
        }
    }

    async getJobResult(job_id, user_id) {
        try {
            const query = `
                SELECT
                    job_id, user_id,
                    language_locale, language_name,
                    audio_format, duration_seconds, blob_name,
                    job_status, current_step,
                    result_id,
                    transcription_text, summary_text,
                    notes_text, notes_json, mind_map_json,
                    generated_at,
                    blob_name
                FROM vw_stt_recording_result
                WHERE job_id = $1 AND user_id = $2
                LIMIT 1
            `;
            const res = await database_service.query(query, [job_id, user_id], true);
            if (!res.success || res.rowCount === 0) return null;
            return res.data[0];
        } catch (error) {
            logger.error(`[JobRepository][getJobResult] Error: ${error.message}`);
            return null;
        }
    }

    async getFailedJobForRetry(job_id, user_id) {
        try {
            const query = `
                SELECT job_id, status, last_error_code
                FROM vw_ai_job_current_status
                WHERE job_id = $1 AND requested_by = $2
                LIMIT 1
            `;
            const res = await database_service.query(query, [job_id, user_id], true);
            if (!res.success || res.rowCount === 0) return null;
            return res.data[0];
        } catch (error) {
            logger.error(`[JobRepository][getFailedJobForRetry] Error: ${error.message}`);
            return null;
        }
    }

    async resetJobForRetry(job_id) {
        const _parseCode = (msg = '') => {
            if (msg.includes('MAX_RETRIES_EXCEEDED')) return 'MAX_RETRIES_EXCEEDED';
            if (msg.includes('JOB_NOT_RETRYABLE'))    return 'JOB_NOT_RETRYABLE';
            if (msg.includes('JOB_NOT_FOUND'))        return 'JOB_NOT_FOUND';
            return null;
        };
        try {
            const query = `CALL sp_reset_ai_job_for_retry_v1($1, $2)`;
            const res = await database_service.query(query, [job_id, JOB_ACTOR_TYPES.BACKEND], false);
            if (!res.success) {
                const code = _parseCode(String(res.error ?? ''));
                if (code) return { ok: false, code };
                logger.error(`[JobRepository][resetJobForRetry] SP error: ${res.error}`);
                return { ok: false, code: 'INTERNAL_ERROR' };
            }
            return { ok: true };
        } catch (error) {
            const code = _parseCode(error.message ?? '');
            if (code) return { ok: false, code };
            logger.error(`[JobRepository][resetJobForRetry] Error: ${error.message}`);
            return { ok: false, code: 'INTERNAL_ERROR' };
        }
    }

    async softDeleteJob(job_id, user_id) {
        const _parseCode = (msg = '') => {
            if (msg.includes('JOB_NOT_FOUND')) return 'JOB_NOT_FOUND';
            return null;
        };
        try {
            const query = `CALL sp_soft_delete_stt_job_v1($1, $2)`;
            const res = await database_service.query(query, [job_id, user_id], false);
            if (!res.success) {
                const code = _parseCode(String(res.error ?? ''));
                if (code) return { ok: false, code };
                logger.error(`[JobRepository][softDeleteJob] SP error: ${res.error}`);
                return { ok: false, code: 'INTERNAL_ERROR' };
            }
            return { ok: true };
        } catch (error) {
            const code = _parseCode(error.message ?? '');
            if (code) return { ok: false, code };
            logger.error(`[JobRepository][softDeleteJob] Error: ${error.message}`);
            return { ok: false, code: 'INTERNAL_ERROR' };
        }
    }

    async requestStepReprocess(job_id, user_id, step, customInstructions) {
        const _parseCode = (msg = '') => {
            if (msg.includes('INVALID_STEP'))     return 'INVALID_STEP';
            if (msg.includes('JOB_NOT_COMPLETED')) return 'JOB_NOT_COMPLETED';
            if (msg.includes('JOB_NOT_FOUND'))     return 'JOB_NOT_FOUND';
            return null;
        };
        try {
            const query = `CALL sp_request_stt_step_reprocess_v1($1, $2, $3, $4, $5)`;
            const values = [job_id, user_id, step, customInstructions ?? null, JOB_ACTOR_TYPES.USER];
            const res = await database_service.query(query, values, false);
            if (!res.success) {
                const code = _parseCode(String(res.error ?? ''));
                if (code) return { ok: false, code };
                logger.error(`[JobRepository][requestStepReprocess] SP error: ${res.error}`);
                return { ok: false, code: 'INTERNAL_ERROR' };
            }
            return { ok: true };
        } catch (error) {
            const code = _parseCode(error.message ?? '');
            if (code) return { ok: false, code };
            logger.error(`[JobRepository][requestStepReprocess] Error: ${error.message}`);
            return { ok: false, code: 'INTERNAL_ERROR' };
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
