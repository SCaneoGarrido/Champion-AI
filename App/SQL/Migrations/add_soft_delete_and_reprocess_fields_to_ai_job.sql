-- ═══════════════════════════════════════════════════════════════════════════
-- Migración: soft delete + reprocesamiento parcial con instrucciones propias
-- Nuevas columnas en ai_job: is_deleted, deleted_at, pending_reprocess_step,
--   pending_reprocess_instructions
-- Objetos afectados:
--   - ai_job (ALTER TABLE)
--   - vw_ai_job_current_status (CREATE OR REPLACE VIEW — agrega filtro is_deleted)
--   - vw_stt_recording_result (CREATE OR REPLACE VIEW — agrega filtro is_deleted)
--   - fn_get_stt_live_recording_job_context (DROP + CREATE — cambia el RETURNS TABLE)
-- Ver ADR-010-knowledge-pack-lifecycle-actions.md
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.ai_job
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS pending_reprocess_step VARCHAR(50),
    ADD COLUMN IF NOT EXISTS pending_reprocess_instructions TEXT;

-- Los jobs eliminados (soft delete) dejan de ser visibles para cualquier
-- consumidor de estas dos vistas — único punto de filtrado, ningún repositorio
-- necesita agregar "AND is_deleted = FALSE" por su cuenta.
CREATE OR REPLACE VIEW public.vw_ai_job_current_status AS
 SELECT j.job_id,
    j.requested_by,
    j.service_code,
    j.feature_code,
    j.flow,
    j.status,
    j.current_step,
    j.polling_url,
    j.requested_at,
    j.started_at,
    j.completed_at,
    j.failed_at,
    j.last_error_code,
    j.last_error_message,
    j.last_error_retryable,
    h.id_history,
    h.step_name,
    h.message,
    h.error_code,
    h.error_message,
    h.error_field,
    h.retryable,
    h.steps_snapshot,
    h.metadata AS history_metadata,
    h.created_by_type,
    h.created_at AS last_status_at
   FROM (public.ai_job j
     LEFT JOIN public.ai_job_status_history h ON (((h.job_id)::text = (j.job_id)::text) AND (h.is_current = true)))
   WHERE j.is_deleted = FALSE;

CREATE OR REPLACE VIEW public.vw_stt_recording_result AS
 SELECT r.recording_id,
    r.job_id,
    r.user_id,
    r.language_locale,
    r.language_name,
    r.audio_format,
    r.sample_rate,
    r.duration_seconds,
    r.blob_name,
    r.blob_url,
    r.upload_id,
    r.upload_status,
    r.size_bytes,
    r.checksum_sha256,
    r.expires_at,
    j.status AS job_status,
    j.current_step,
    j.polling_url,
    result.result_id,
    result.transcription_text,
    result.summary_text,
    result.notes_text,
    result.notes_json,
    result.mind_map_json,
    result.raw_result_json,
    result.generated_at,
    r.created_at AS recording_created_at,
    r.updated_at AS recording_updated_at,
    result.created_at AS result_created_at,
    result.updated_at AS result_updated_at
   FROM ((public.stt_recording r
     JOIN public.ai_job j ON (((j.job_id)::text = (r.job_id)::text)))
     LEFT JOIN public.stt_recording_result result ON (((result.recording_id = r.recording_id) AND ((result.job_id)::text = (r.job_id)::text))))
   WHERE j.is_deleted = FALSE;

-- fn_get_stt_live_recording_job_context cambia su RETURNS TABLE (agrega 2
-- columnas nuevas) — CREATE OR REPLACE no permite cambiar la firma de retorno
-- de una función, por lo que se elimina y recrea (mismo patrón usado en
-- migrate_duration_seconds_to_numeric.sql).
DROP FUNCTION IF EXISTS public.fn_get_stt_live_recording_job_context(VARCHAR(100));

CREATE FUNCTION public.fn_get_stt_live_recording_job_context(
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
    duration_seconds NUMERIC(10,3),

    blob_name TEXT,
    blob_url TEXT,
    upload_status VARCHAR(50),

    request_payload JSONB,
    job_metadata JSONB,

    pending_reprocess_step VARCHAR(50),
    pending_reprocess_instructions TEXT
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
        j.metadata AS job_metadata,

        j.pending_reprocess_step,
        j.pending_reprocess_instructions

    FROM ai_job j
    INNER JOIN stt_recording r
        ON r.job_id = j.job_id

    WHERE j.job_id = p_job_id;
END;
$$;

COMMIT;
