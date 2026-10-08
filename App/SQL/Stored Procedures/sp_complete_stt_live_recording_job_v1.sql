/*
 *
 * Estrategia usada: 
 *
 * Extender los parámetros explícitos + usar COALESCE en el DO UPDATE
  Agregar p_transcript_clean_text TEXT DEFAULT NULL y p_topics_json JSONB DEFAULT NULL como parámetros al procedimiento, 
  y dentro de la cláusula DO UPDATE SET, usar COALESCE
 *
 * */




CREATE OR REPLACE PROCEDURE sp_complete_stt_live_recording_job_v1(
    p_job_id VARCHAR(100),
    p_final_status VARCHAR(50),
    p_final_step VARCHAR(100),
    p_completion_message TEXT,
    p_actor_type VARCHAR(30),
    p_transcription_text TEXT DEFAULT NULL,
    p_summary_text TEXT DEFAULT NULL,
    p_notes_text TEXT DEFAULT NULL,
    p_notes_json JSONB DEFAULT NULL,
    p_mind_map_json JSONB DEFAULT NULL,
    p_raw_result_json JSONB DEFAULT NULL,
    p_transcript_clean_text TEXT DEFAULT NULL,
    p_topics_json JSONB DEFAULT NULL
)
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

    -- 2. Insertar o actualizar el resultado del STT (Upsert seguro con COALESCE)
    INSERT INTO stt_recording_result (
        recording_id,
        job_id,
        transcription_text,
        transcript_clean_text,
        summary_text,
        notes_text,
        notes_json,
        mind_map_json,
        topics_json,
        raw_result_json,
        generated_at,
        created_at,
        updated_at
    )
    VALUES (
        v_recording_id,
        p_job_id,
        p_transcription_text,
        p_transcript_clean_text,
        p_summary_text,
        p_notes_text,
        p_notes_json,
        p_mind_map_json,
        p_topics_json,
        p_raw_result_json,
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (recording_id)
    DO UPDATE SET
        transcription_text    = COALESCE(EXCLUDED.transcription_text, stt_recording_result.transcription_text),
        transcript_clean_text = COALESCE(EXCLUDED.transcript_clean_text, stt_recording_result.transcript_clean_text),
        summary_text          = COALESCE(EXCLUDED.summary_text, stt_recording_result.summary_text),
        notes_text            = COALESCE(EXCLUDED.notes_text, stt_recording_result.notes_text),
        notes_json            = COALESCE(EXCLUDED.notes_json, stt_recording_result.notes_json),
        mind_map_json         = COALESCE(EXCLUDED.mind_map_json, stt_recording_result.mind_map_json),
        topics_json           = COALESCE(EXCLUDED.topics_json, stt_recording_result.topics_json),
        raw_result_json       = COALESCE(EXCLUDED.raw_result_json, stt_recording_result.raw_result_json),
        generated_at          = NOW(),
        updated_at            = NOW();

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

    -- 5. Actualizar la tabla principal marcando la fecha de completado
    UPDATE ai_job
    SET
        status = p_final_status,
        current_step = p_final_step,
        completed_at = NOW(),
        pending_reprocess_step = NULL,
        pending_reprocess_instructions = NULL,
        updated_at = NOW()
    WHERE job_id = p_job_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Job % no encontrado en ai_job', p_job_id;
    END IF;

END;
$$ LANGUAGE plpgsql;
