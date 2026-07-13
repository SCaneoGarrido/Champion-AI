-- ============================================================
-- sp_request_stt_step_reprocess_v1
-- Solicita el reprocesamiento de un único step de contenido (summary,
-- notes o mind_map) de un job ya completado, opcionalmente con
-- instrucciones propias del usuario.
--
-- Reglas:
--   · Solo el dueño del job puede solicitarlo
--   · Solo permitido si el job está en status='completed' (no queued/
--     processing/failed) — evita reprocesar algo que aún no terminó
--   · p_step debe ser 'summary' | 'notes' | 'mind_map' — transcription no
--     es reprocesable con instrucciones propias (es audio→texto, no texto→texto)
--   · Anula (SET ... = NULL) solo la(s) columna(s) de stt_recording_result
--     correspondientes al step solicitado. El resto del resultado
--     (incluida transcription_text) se conserva intacto.
--   · Reutiliza el mismo mecanismo de "resultados parciales" que el smart
--     retry: al anular el campo, la próxima ejecución del orquestador
--     Durable (mismo job_id, ver queue_trigger.py) detecta ese campo en NULL
--     y solo regenera ese step — el resto se sirve desde caché sin costo
--     adicional de Azure Speech / Azure OpenAI
--   · Deja el step + las instrucciones pendientes en ai_job para que la
--     Azure Function los recoja via fn_get_stt_live_recording_job_context —
--     se limpian automáticamente al completar
--     (ver sp_complete_stt_live_recording_job_v1)
--   · Transiciona el job a 'queued' — mismo patrón de historial que
--     sp_reset_ai_job_for_retry_v1
-- ============================================================

CREATE OR REPLACE PROCEDURE sp_request_stt_step_reprocess_v1(
    p_job_id               VARCHAR(100),
    p_user_id              UUID,
    p_step                 VARCHAR(50),
    p_custom_instructions  TEXT DEFAULT NULL,
    p_actor_type           VARCHAR(30) DEFAULT 'user'
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status VARCHAR(50);
BEGIN
    IF p_step NOT IN ('summary', 'notes', 'mind_map') THEN
        RAISE EXCEPTION 'INVALID_STEP';
    END IF;

    SELECT status INTO v_status
    FROM ai_job
    WHERE job_id = p_job_id
      AND requested_by = p_user_id
      AND is_deleted = FALSE
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'JOB_NOT_FOUND';
    END IF;

    IF v_status != 'completed' THEN
        RAISE EXCEPTION 'JOB_NOT_COMPLETED';
    END IF;

    UPDATE stt_recording_result
    SET summary_text  = CASE WHEN p_step = 'summary'  THEN NULL ELSE summary_text  END,
        notes_text    = CASE WHEN p_step = 'notes'    THEN NULL ELSE notes_text    END,
        notes_json    = CASE WHEN p_step = 'notes'    THEN NULL ELSE notes_json    END,
        mind_map_json = CASE WHEN p_step = 'mind_map' THEN NULL ELSE mind_map_json END,
        updated_at    = NOW()
    WHERE job_id = p_job_id;

    -- Historial: mismo protocolo is_current que el resto de las transiciones
    UPDATE ai_job_status_history
    SET is_current = FALSE
    WHERE job_id = p_job_id
      AND is_current = TRUE;

    INSERT INTO ai_job_status_history (
        job_id, status, step_name, message, is_current, created_by_type, created_at
    ) VALUES (
        p_job_id,
        'queued',
        'reprocess_' || p_step,
        'Reprocesamiento de "' || p_step || '" solicitado por el usuario',
        TRUE,
        p_actor_type,
        NOW()
    );

    UPDATE ai_job
    SET status                          = 'queued',
        current_step                    = 'reprocess_' || p_step,
        pending_reprocess_step          = p_step,
        pending_reprocess_instructions  = p_custom_instructions,
        updated_at                      = NOW()
    WHERE job_id = p_job_id;
END;
$$;
