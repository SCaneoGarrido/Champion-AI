CREATE OR REPLACE PROCEDURE sp_create_stt_live_recording_job_v1(
    p_job_id VARCHAR(100),
    p_user_id UUID,

    p_service_code VARCHAR(50),
    p_feature_code VARCHAR(100),
    p_flow VARCHAR(100),

    p_initial_status VARCHAR(50),
    p_initial_message TEXT,
    p_actor_type VARCHAR(30),

    p_language_locale VARCHAR(20),
    p_language_name VARCHAR(100),

    p_audio_format VARCHAR(20),
    p_sample_rate INTEGER,
    p_duration_seconds NUMERIC(10,3),

    p_blob_name TEXT,
    p_blob_url TEXT,

    p_upload_status VARCHAR(50),
    p_request_payload JSONB DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO ai_job (
        job_id,
        requested_by,
        service_code,
        feature_code,
        flow,
        status,
        current_step,
        polling_url,
        request_payload,
        requested_at,
        created_at,
        updated_at
    )
    VALUES (
        p_job_id,
        p_user_id,
        p_service_code,
        p_feature_code,
        p_flow,
        p_initial_status,
        NULL,
        '/AIServices/Speechv2/jobs/' || p_job_id || '/status',
        p_request_payload,
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (job_id)
    DO UPDATE SET
        status = EXCLUDED.status,
        service_code = EXCLUDED.service_code,
        feature_code = EXCLUDED.feature_code,
        flow = EXCLUDED.flow,
        polling_url = EXCLUDED.polling_url,
        request_payload = COALESCE(EXCLUDED.request_payload, ai_job.request_payload),
        updated_at = NOW();

    UPDATE ai_job_status_history
    SET is_current = FALSE
    WHERE job_id = p_job_id
      AND is_current = TRUE;

    INSERT INTO ai_job_status_history (
        job_id,
        status,
        step_name,
        message,
        is_current,
        created_by,
        created_by_type,
        created_at
    )
    VALUES (
        p_job_id,
        p_initial_status,
        NULL,
        p_initial_message,
        TRUE,
        p_user_id,
        p_actor_type,
        NOW()
    );

    INSERT INTO stt_recording (
        job_id,
        user_id,
        language_locale,
        language_name,
        audio_format,
        sample_rate,
        duration_seconds,
        blob_name,
        blob_url,
        upload_status,
        created_at,
        updated_at
    )
    VALUES (
        p_job_id,
        p_user_id,
        p_language_locale,
        p_language_name,
        p_audio_format,
        p_sample_rate,
        p_duration_seconds,
        p_blob_name,
        p_blob_url,
        p_upload_status,
        NOW(),
        NOW()
    )
    ON CONFLICT (job_id)
    DO UPDATE SET
        user_id = EXCLUDED.user_id,
        language_locale = EXCLUDED.language_locale,
        language_name = EXCLUDED.language_name,
        audio_format = EXCLUDED.audio_format,
        sample_rate = EXCLUDED.sample_rate,
        duration_seconds = EXCLUDED.duration_seconds,
        blob_name = EXCLUDED.blob_name,
        blob_url = EXCLUDED.blob_url,
        upload_status = EXCLUDED.upload_status,
        updated_at = NOW();
END;
$$;