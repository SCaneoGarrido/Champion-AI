CREATE OR REPLACE FUNCTION fn_get_stt_live_recording_job_context(
    p_job_id VARCHAR(100)
)
RETURNS TABLE (
    job_id VARCHAR(100),
    user_id UUID,

    service_code VARCHAR(50),
    feature_code VARCHAR(100),
    flow VARCHAR(100),
    status VARCHAR(50),
    current_step VARCHAR(100),

    recording_id UUID,

    language_locale VARCHAR(20),
    language_name VARCHAR(100),

    audio_format VARCHAR(20),
    sample_rate INTEGER,
    duration_seconds INTEGER,

    blob_name TEXT,
    blob_url TEXT,
    upload_status VARCHAR(50),

    request_payload JSONB,
    job_metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        j.job_id,
        j.requested_by AS user_id,

        j.service_code,
        j.feature_code,
        j.flow,
        j.status,
        j.current_step,

        r.recording_id,

        r.language_locale,
        r.language_name,

        r.audio_format,
        r.sample_rate,
        r.duration_seconds,

        r.blob_name,
        r.blob_url,
        r.upload_status,

        j.request_payload,
        j.metadata AS job_metadata

    FROM ai_job j
    INNER JOIN stt_recording r
        ON r.job_id = j.job_id

    WHERE j.job_id = p_job_id;
END;
$$;