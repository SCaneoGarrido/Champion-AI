-- ============================================================
-- sp_save_stt_partial_result_v1
-- Guarda resultados parciales de STT en stt_recording_result para
-- permitir reintento desde el paso donde se falló.
--
-- Comportamiento:
--   · Upsert: crea la fila si no existe, actualiza si ya existe
--   · Usa COALESCE en UPDATE para preservar campos ya guardados
--     (solo sobreescribe si el parámetro entrante es NOT NULL)
--   · Idempotente: llamadas repetidas con el mismo valor son seguras
-- ============================================================

CREATE OR REPLACE PROCEDURE sp_save_stt_partial_result_v1(
    p_job_id                 VARCHAR(100),
    p_transcription_text     TEXT  DEFAULT NULL,
    p_summary_text           TEXT  DEFAULT NULL,
    p_notes_text             TEXT  DEFAULT NULL,
    p_notes_json             JSONB DEFAULT NULL,
    p_mind_map_json          JSONB DEFAULT NULL,
    p_mind_map_mermaid_code  TEXT  DEFAULT NULL  -- Presentation Layer: proyección determinística de p_mind_map_json, no generada por IA
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_recording_id UUID;
BEGIN
    SELECT recording_id INTO v_recording_id
    FROM stt_recording
    WHERE job_id = p_job_id;

    IF v_recording_id IS NULL THEN
        RAISE EXCEPTION 'Recording no encontrado para job_id = %', p_job_id;
    END IF;

    INSERT INTO stt_recording_result (
        recording_id,
        job_id,
        transcription_text,
        summary_text,
        notes_text,
        notes_json,
        mind_map_json,
        mind_map_mermaid_code,
        generated_at,
        created_at,
        updated_at
    ) VALUES (
        v_recording_id,
        p_job_id,
        p_transcription_text,
        p_summary_text,
        p_notes_text,
        p_notes_json,
        p_mind_map_json,
        p_mind_map_mermaid_code,
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (recording_id) DO UPDATE SET
        transcription_text     = COALESCE(EXCLUDED.transcription_text,     stt_recording_result.transcription_text),
        summary_text           = COALESCE(EXCLUDED.summary_text,           stt_recording_result.summary_text),
        notes_text              = COALESCE(EXCLUDED.notes_text,             stt_recording_result.notes_text),
        notes_json              = COALESCE(EXCLUDED.notes_json,             stt_recording_result.notes_json),
        mind_map_json           = COALESCE(EXCLUDED.mind_map_json,          stt_recording_result.mind_map_json),
        mind_map_mermaid_code   = COALESCE(EXCLUDED.mind_map_mermaid_code,  stt_recording_result.mind_map_mermaid_code),
        updated_at              = NOW();
END;
$$;
