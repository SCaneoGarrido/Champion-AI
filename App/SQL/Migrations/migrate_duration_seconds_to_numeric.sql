-- ═══════════════════════════════════════════════════════════════════════════
-- Migración: duration_seconds INTEGER → NUMERIC(10,3)
--
-- Objetos afectados:
--   1. stt_recording.duration_seconds  (columna + constraint)
--   2. vw_stt_recording_result          (view — recrear para reflejar tipo)
--   3. sp_create_stt_live_recording_job_v1  (parámetro p_duration_seconds)
--   4. fn_get_stt_live_recording_job_context (tipo de retorno)
--
-- Ejecutar como: psql -U champion_db_user -d champion_db -f migrate_duration_seconds_to_numeric.sql
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Tabla stt_recording ─────────────────────────────────────────────────

-- Eliminar constraint que compara con entero
ALTER TABLE public.stt_recording
    DROP CONSTRAINT chk_stt_recording_duration;

-- Cambiar tipo de columna (INTEGER → NUMERIC(10,3))
ALTER TABLE public.stt_recording
    ALTER COLUMN duration_seconds TYPE NUMERIC(10,3)
    USING duration_seconds::NUMERIC(10,3);

-- Recrear constraint con tipo NUMERIC
ALTER TABLE public.stt_recording
    ADD CONSTRAINT chk_stt_recording_duration
        CHECK (
            duration_seconds IS NULL
            OR (duration_seconds >= 1 AND duration_seconds <= 10800)
        );

-- ── 2. Vista vw_stt_recording_result ──────────────────────────────────────
-- PostgreSQL cachea los tipos de columna en la definición de la view.
-- Es necesario recrearla para que duration_seconds refleje NUMERIC(10,3).

DROP VIEW IF EXISTS public.vw_stt_recording_result;

CREATE VIEW public.vw_stt_recording_result AS
    SELECT
        r.recording_id,
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
        j.status           AS job_status,
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
        r.created_at       AS recording_created_at,
        r.updated_at       AS recording_updated_at,
        result.created_at  AS result_created_at,
        result.updated_at  AS result_updated_at
    FROM public.stt_recording r
    JOIN public.ai_job j
        ON j.job_id::text = r.job_id::text
    LEFT JOIN public.stt_recording_result result
        ON result.recording_id = r.recording_id
       AND result.job_id::text = r.job_id::text;

ALTER VIEW public.vw_stt_recording_result OWNER TO champion_db_user;

-- ── 3. SP sp_create_stt_live_recording_job_v1 ─────────────────────────────
-- CREATE OR REPLACE no puede cambiar tipos de parámetros → DROP + CREATE.

DROP PROCEDURE IF EXISTS public.sp_create_stt_live_recording_job_v1(
    character varying, uuid,
    character varying, character varying, character varying,
    character varying, text, character varying,
    character varying, character varying,
    character varying, integer, integer,
    text, text,
    character varying, jsonb
);

CREATE PROCEDURE public.sp_create_stt_live_recording_job_v1(
    p_job_id            VARCHAR(100),
    p_user_id           UUID,

    p_service_code      VARCHAR(50),
    p_feature_code      VARCHAR(100),
    p_flow              VARCHAR(100),

    p_initial_status    VARCHAR(50),
    p_initial_message   TEXT,
    p_actor_type        VARCHAR(30),

    p_language_locale   VARCHAR(20),
    p_language_name     VARCHAR(100),

    p_audio_format      VARCHAR(20),
    p_sample_rate       INTEGER,
    p_duration_seconds  NUMERIC(10,3),     -- ← cambiado de INTEGER

    p_blob_name         TEXT,
    p_blob_url          TEXT,

    p_upload_status     VARCHAR(50),
    p_request_payload   JSONB DEFAULT NULL
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
        status          = EXCLUDED.status,
        service_code    = EXCLUDED.service_code,
        feature_code    = EXCLUDED.feature_code,
        flow            = EXCLUDED.flow,
        polling_url     = EXCLUDED.polling_url,
        request_payload = COALESCE(EXCLUDED.request_payload, ai_job.request_payload),
        updated_at      = NOW();

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
        user_id          = EXCLUDED.user_id,
        language_locale  = EXCLUDED.language_locale,
        language_name    = EXCLUDED.language_name,
        audio_format     = EXCLUDED.audio_format,
        sample_rate      = EXCLUDED.sample_rate,
        duration_seconds = EXCLUDED.duration_seconds,
        blob_name        = EXCLUDED.blob_name,
        blob_url         = EXCLUDED.blob_url,
        upload_status    = EXCLUDED.upload_status,
        updated_at       = NOW();
END;
$$;

-- ── 4. Función fn_get_stt_live_recording_job_context ──────────────────────
-- RETURNS TABLE con duration_seconds INTEGER → NUMERIC(10,3).
-- CREATE OR REPLACE no puede cambiar el tipo de retorno → DROP + CREATE.

DROP FUNCTION IF EXISTS public.fn_get_stt_live_recording_job_context(character varying);

CREATE FUNCTION public.fn_get_stt_live_recording_job_context(
    p_job_id VARCHAR(100)
)
RETURNS TABLE (
    job_id          VARCHAR(100),
    user_id         UUID,

    service_code    VARCHAR(50),
    feature_code    VARCHAR(100),
    flow            VARCHAR(100),
    status          VARCHAR(50),
    current_step    VARCHAR(100),

    recording_id    UUID,

    language_locale VARCHAR(20),
    language_name   VARCHAR(100),

    audio_format    VARCHAR(20),
    sample_rate     INTEGER,
    duration_seconds NUMERIC(10,3),    -- ← cambiado de INTEGER

    blob_name       TEXT,
    blob_url        TEXT,
    upload_status   VARCHAR(50),

    request_payload JSONB,
    job_metadata    JSONB
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

COMMIT;
