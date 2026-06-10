CREATE OR REPLACE PROCEDURE sp_update_ai_job_status_v1(
    p_job_id VARCHAR(100),
    p_status VARCHAR(50),
    p_step_name VARCHAR(100),
    p_message TEXT DEFAULT NULL,
    p_error_code VARCHAR(100) DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_retryable BOOLEAN DEFAULT NULL,
    p_steps_snapshot JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL,
    p_actor_type VARCHAR(30) DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- 1. Desactivar el estado actual previo en el historial
    UPDATE ai_job_status_history
    SET is_current = FALSE
    WHERE job_id = p_job_id
      AND is_current = TRUE;

    -- 2. Insertar el nuevo registro de historial con el nuevo estado y paso
    INSERT INTO ai_job_status_history (
        job_id,
        status,
        step_name,
        message,
        error_code,
        error_message,
        retryable,
        steps_snapshot,
        metadata,
        is_current,
        created_by_type,
        created_at
    )
    VALUES (
        p_job_id,
        p_status,
        p_step_name,
        p_message,
        p_error_code,
        p_error_message,
        p_retryable,
        p_steps_snapshot,
        p_metadata,
        TRUE,
        p_actor_type,
        NOW()
    );

    -- 3. Actualizar el estado global del Job en la tabla principal
    UPDATE ai_job
    SET
        status = p_status,
        current_step = p_step_name,
        started_at = CASE
            WHEN p_status = 'processing' AND started_at IS NULL THEN NOW()
            ELSE started_at
        END,
        failed_at = CASE
            WHEN p_status = 'failed' THEN NOW()
            ELSE failed_at
        END,
        last_error_code = p_error_code,
        last_error_message = p_error_message,
        last_error_retryable = p_retryable,
        updated_at = NOW()
    WHERE job_id = p_job_id;

END;
$$;
