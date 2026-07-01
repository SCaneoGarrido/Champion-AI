-- ============================================================
-- sp_reset_ai_job_for_retry_v1
-- Resetea un job en estado 'failed' a 'queued' para reprocesamiento.
--
-- Reglas:
--   · Solo funciona si el job está en estado 'failed'
--   · Máximo 3 reintentos (contados por entradas 'failed' en historial)
--   · Limpia last_error_code / last_error_message / last_error_retryable en ai_job
--   · Desactiva la entrada is_current=TRUE del historial y registra nueva entrada 'queued'
--   · Idempotente: lanza excepción clara si el job no está en 'failed'
-- ============================================================

CREATE OR REPLACE PROCEDURE sp_reset_ai_job_for_retry_v1(
    p_job_id        VARCHAR(100),
    p_actor_type    VARCHAR(30) DEFAULT 'backend'
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_status    VARCHAR(50);
    v_failed_count      INT;
    v_max_retries       CONSTANT INT := 3;
    v_retry_number      INT;
BEGIN
    -- 1. Verificar que el job existe y obtener estado actual (lock de fila)
    SELECT status INTO v_current_status
    FROM ai_job
    WHERE job_id = p_job_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'JOB_NOT_FOUND';
    END IF;

    IF v_current_status != 'failed' THEN
        RAISE EXCEPTION 'JOB_NOT_RETRYABLE';
    END IF;

    -- 2. Contar cuántas veces ha fallado (= número de reintentos previos)
    SELECT COUNT(*) INTO v_failed_count
    FROM ai_job_status_history
    WHERE job_id = p_job_id
      AND status = 'failed';

    IF v_failed_count >= v_max_retries THEN
        RAISE EXCEPTION 'MAX_RETRIES_EXCEEDED';
    END IF;

    v_retry_number := v_failed_count + 1;

    -- 3. Desactivar entrada vigente en historial
    UPDATE ai_job_status_history
    SET is_current = FALSE
    WHERE job_id = p_job_id
      AND is_current = TRUE;

    -- 4. Registrar el reintento en historial
    INSERT INTO ai_job_status_history (
        job_id,
        status,
        step_name,
        message,
        is_current,
        created_by_type,
        created_at
    ) VALUES (
        p_job_id,
        'queued',
        'retry',
        'Reintento #' || v_retry_number || ' solicitado manualmente',
        TRUE,
        p_actor_type,
        NOW()
    );

    -- 5. Resetear ai_job a queued y limpiar errores
    UPDATE ai_job
    SET
        status               = 'queued',
        current_step         = 'retry',
        last_error_code      = NULL,
        last_error_message   = NULL,
        last_error_retryable = NULL,
        updated_at           = NOW()
    WHERE job_id = p_job_id;

END;
$$;
