CREATE OR REPLACE PROCEDURE sp_complete_stt_live_recording_job_v1(
    p_job_id VARCHAR(100),
    p_final_status VARCHAR(50),
    p_final_step VARCHAR(100),
    p_completion_message TEXT,
    p_actor_type VARCHAR(30),
    p_transcription_text TEXT,
    p_summary_text TEXT,
    p_notes_text TEXT,
    p_notes_json JSONB,
    p_mind_map_json JSONB,
    p_raw_result_json JSONB DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_recording_id UUID;
BEGIN
    -- 1. Buscar el recording_id asociado al job
    SELECT recording_id
    INTO v_recording_id
    FROM stt_recording
    WHERE job_id = p_job_id;

    -- Validar si existe la grabación antes de continuar
    IF v_recording_id IS NULL THEN
        RAISE EXCEPTION 'Recording no encontrado para job %', p_job_id;
    END IF;

    -- 2. Insertar o actualizar el resultado del STT (Upsert)
    INSERT INTO stt_recording_result (
        recording_id,
        job_id,
        transcription_text,
        summary_text,
        notes_text,
        notes_json,
        mind_map_json,
        raw_result_json,
        generated_at,
        created_at,
        updated_at
    )
    VALUES (
        v_recording_id,
        p_job_id,
        p_transcription_text,
        p_summary_text,
        p_notes_text,
        p_notes_json,
        p_mind_map_json,
        p_raw_result_json,
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (recording_id)
    DO UPDATE SET
        transcription_text = EXCLUDED.transcription_text,
        summary_text = EXCLUDED.summary_text,
        notes_text = EXCLUDED.notes_text,
        notes_json = EXCLUDED.notes_json,
        mind_map_json = EXCLUDED.mind_map_json,
        raw_result_json = EXCLUDED.raw_result_json,
        generated_at = NOW(),
        updated_at = NOW();

    -- 3. Desactivar el estado actual previo en el historial
    UPDATE ai_job_status_history
    SET is_current = FALSE
    WHERE job_id = p_job_id
      AND is_current = TRUE;

    -- 4. Insertar el estado final en el historial
    INSERT INTO ai_job_status_history (
        job_id,
        status,
        step_name,
        message,
        is_current,
        created_by_type,
        created_at
    )
    VALUES (
        p_job_id,
        p_final_status,
        p_final_step,
        p_completion_message,
        TRUE,
        p_actor_type,
        NOW()
    );

    -- 5. Actualizar la tabla principal marcando la fecha de completado.
    --    Limpia pending_reprocess_step/instructions: si este ciclo vino de un
    --    reprocesamiento parcial (sp_request_stt_step_reprocess_v1), ya se
    --    consumió — no debe quedar pendiente para la próxima ejecución.
    UPDATE ai_job
    SET
        status = p_final_status,
        current_step = p_final_step,
        completed_at = NOW(),
        pending_reprocess_step = NULL,
        pending_reprocess_instructions = NULL,
        updated_at = NOW()
    WHERE job_id = p_job_id;

END;
$$;
