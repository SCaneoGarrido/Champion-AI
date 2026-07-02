--
-- PostgreSQL database dump
--

\restrict FZlacDUVTabc8ZfoTG05Udf08v989LggHiGUkcIyN5EVPWNuz80x7hqlv5MtPqC

-- Dumped from database version 17.10
-- Dumped by pg_dump version 17.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.stt_recording DROP CONSTRAINT IF EXISTS fk_stt_recording_user;
ALTER TABLE IF EXISTS ONLY public.stt_recording_result DROP CONSTRAINT IF EXISTS fk_stt_recording_result_recording_job;
ALTER TABLE IF EXISTS ONLY public.stt_recording DROP CONSTRAINT IF EXISTS fk_stt_recording_job_user;
ALTER TABLE IF EXISTS ONLY public.stt_recording DROP CONSTRAINT IF EXISTS fk_stt_recording_job;
ALTER TABLE IF EXISTS ONLY public.sec_user DROP CONSTRAINT IF EXISTS fk_sec_user_updated_by;
ALTER TABLE IF EXISTS ONLY public.sec_user_password DROP CONSTRAINT IF EXISTS fk_sec_user_password_user;
ALTER TABLE IF EXISTS ONLY public.sec_user DROP CONSTRAINT IF EXISTS fk_sec_user_created_by;
ALTER TABLE IF EXISTS ONLY public.ai_job_status_history DROP CONSTRAINT IF EXISTS fk_ai_job_status_history_job;
ALTER TABLE IF EXISTS ONLY public.ai_job_status_history DROP CONSTRAINT IF EXISTS fk_ai_job_status_history_created_by;
ALTER TABLE IF EXISTS ONLY public.ai_job DROP CONSTRAINT IF EXISTS fk_ai_job_requested_by;
DROP TRIGGER IF EXISTS trg_stt_recording_updated_at ON public.stt_recording;
DROP TRIGGER IF EXISTS trg_stt_recording_result_updated_at ON public.stt_recording_result;
DROP TRIGGER IF EXISTS trg_sec_user_updated_at ON public.sec_user;
DROP TRIGGER IF EXISTS trg_sec_user_password_updated_at ON public.sec_user_password;
DROP TRIGGER IF EXISTS trg_ai_job_updated_at ON public.ai_job;
DROP INDEX IF EXISTS public.uq_sec_user_username_lower;
DROP INDEX IF EXISTS public.uq_sec_user_password_active;
DROP INDEX IF EXISTS public.uq_sec_user_email_lower;
DROP INDEX IF EXISTS public.uq_ai_job_status_history_current;
DROP INDEX IF EXISTS public.idx_stt_recording_user_id;
DROP INDEX IF EXISTS public.idx_stt_recording_upload_status;
DROP INDEX IF EXISTS public.idx_stt_recording_result_recording_id;
DROP INDEX IF EXISTS public.idx_stt_recording_result_job_id;
DROP INDEX IF EXISTS public.idx_stt_recording_result_created_at;
DROP INDEX IF EXISTS public.idx_stt_recording_job_id;
DROP INDEX IF EXISTS public.idx_stt_recording_created_at;
DROP INDEX IF EXISTS public.idx_sec_user_password_user_id;
DROP INDEX IF EXISTS public.idx_sec_user_is_active;
DROP INDEX IF EXISTS public.idx_ai_job_status_history_status;
DROP INDEX IF EXISTS public.idx_ai_job_status_history_job_id;
DROP INDEX IF EXISTS public.idx_ai_job_status_history_created_at;
DROP INDEX IF EXISTS public.idx_ai_job_status;
DROP INDEX IF EXISTS public.idx_ai_job_service_feature;
DROP INDEX IF EXISTS public.idx_ai_job_requested_by;
DROP INDEX IF EXISTS public.idx_ai_job_flow;
DROP INDEX IF EXISTS public.idx_ai_job_created_at;
ALTER TABLE IF EXISTS ONLY public.stt_recording_result DROP CONSTRAINT IF EXISTS uq_stt_recording_result_recording;
ALTER TABLE IF EXISTS ONLY public.stt_recording_result DROP CONSTRAINT IF EXISTS uq_stt_recording_result_job;
ALTER TABLE IF EXISTS ONLY public.stt_recording DROP CONSTRAINT IF EXISTS uq_stt_recording_recording_job;
ALTER TABLE IF EXISTS ONLY public.stt_recording DROP CONSTRAINT IF EXISTS uq_stt_recording_job;
ALTER TABLE IF EXISTS ONLY public.ai_job DROP CONSTRAINT IF EXISTS uq_ai_job_job_requested_by;
ALTER TABLE IF EXISTS ONLY public.stt_recording DROP CONSTRAINT IF EXISTS unique_job_id;
ALTER TABLE IF EXISTS ONLY public.stt_recording_result DROP CONSTRAINT IF EXISTS stt_recording_result_pkey;
ALTER TABLE IF EXISTS ONLY public.stt_recording DROP CONSTRAINT IF EXISTS stt_recording_pkey;
ALTER TABLE IF EXISTS ONLY public.sec_user DROP CONSTRAINT IF EXISTS sec_user_pkey;
ALTER TABLE IF EXISTS ONLY public.sec_user_password DROP CONSTRAINT IF EXISTS sec_user_password_pkey;
ALTER TABLE IF EXISTS ONLY public.ai_job_status_history DROP CONSTRAINT IF EXISTS ai_job_status_history_pkey;
ALTER TABLE IF EXISTS ONLY public.ai_job DROP CONSTRAINT IF EXISTS ai_job_pkey;
DROP VIEW IF EXISTS public.vw_stt_recording_result;
DROP VIEW IF EXISTS public.vw_ai_job_current_status;
DROP TABLE IF EXISTS public.stt_recording_result;
DROP TABLE IF EXISTS public.stt_recording;
DROP TABLE IF EXISTS public.sec_user_password;
DROP TABLE IF EXISTS public.sec_user;
DROP TABLE IF EXISTS public.ai_job_status_history;
DROP TABLE IF EXISTS public.ai_job;
DROP FUNCTION IF EXISTS public.sync_ai_job_from_history();
DROP PROCEDURE IF EXISTS public.sp_update_ai_job_status_v1(IN p_job_id character varying, IN p_status character varying, IN p_step_name character varying, IN p_message text, IN p_error_code character varying, IN p_error_message text, IN p_retryable boolean, IN p_steps_snapshot jsonb, IN p_metadata jsonb, IN p_actor_type character varying);
DROP PROCEDURE IF EXISTS public.sp_save_stt_partial_result_v1(IN p_job_id character varying, IN p_transcription_text text, IN p_summary_text text, IN p_notes_text text, IN p_notes_json jsonb, IN p_mind_map_json jsonb, IN p_mind_map_mermaid_code text);
DROP PROCEDURE IF EXISTS public.sp_save_mindmap_svg_v1(IN p_job_id character varying, IN p_user_id uuid, IN p_svg text);
DROP PROCEDURE IF EXISTS public.sp_reset_ai_job_for_retry_v1(IN p_job_id character varying, IN p_actor_type character varying);
DROP PROCEDURE IF EXISTS public.sp_create_stt_live_recording_job_v1(IN p_job_id character varying, IN p_user_id uuid, IN p_service_code character varying, IN p_feature_code character varying, IN p_flow character varying, IN p_initial_status character varying, IN p_initial_message text, IN p_actor_type character varying, IN p_language_locale character varying, IN p_language_name character varying, IN p_audio_format character varying, IN p_sample_rate integer, IN p_duration_seconds numeric, IN p_blob_name text, IN p_blob_url text, IN p_upload_status character varying, IN p_request_payload jsonb);
DROP PROCEDURE IF EXISTS public.sp_complete_stt_live_recording_job_v1(IN p_job_id character varying, IN p_final_status character varying, IN p_final_step character varying, IN p_completion_message text, IN p_actor_type character varying, IN p_transcription_text text, IN p_summary_text text, IN p_notes_text text, IN p_notes_json jsonb, IN p_mind_map_json jsonb, IN p_raw_result_json jsonb, IN p_mind_map_mermaid_code text);
DROP FUNCTION IF EXISTS public.set_updated_at();
DROP FUNCTION IF EXISTS public.fn_get_stt_live_recording_job_context(p_job_id character varying);
DROP FUNCTION IF EXISTS public.fn_can_process_ai_job(p_job_id character varying);
DROP EXTENSION IF EXISTS pgcrypto;
--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: fn_can_process_ai_job(character varying); Type: FUNCTION; Schema: public; Owner: champion_db_user
--

CREATE FUNCTION public.fn_can_process_ai_job(p_job_id character varying) RETURNS TABLE(can_process boolean, reason text, current_status character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN j.job_id IS NULL THEN FALSE
            WHEN j.status IN ('completed', 'failed') THEN FALSE
            WHEN j.status NOT IN ('queued', 'processing') THEN FALSE
            ELSE TRUE
        END AS can_process,
        CASE
            WHEN j.job_id IS NULL THEN 'JOB_NOT_FOUND'
            WHEN j.status = 'completed' THEN 'JOB_ALREADY_COMPLETED'
            WHEN j.status = 'failed' THEN 'JOB_ALREADY_FAILED'
            WHEN j.status NOT IN ('queued', 'processing') THEN 'INVALID_JOB_STATUS'
            ELSE NULL
        END AS reason,
        j.status AS current_status
    FROM ai_job j
    WHERE j.job_id = p_job_id;

    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            FALSE,
            'JOB_NOT_FOUND'::TEXT,
            NULL::VARCHAR(50);
    END IF;
END;
$$;


ALTER FUNCTION public.fn_can_process_ai_job(p_job_id character varying) OWNER TO champion_db_user;

--
-- Name: fn_get_stt_live_recording_job_context(character varying); Type: FUNCTION; Schema: public; Owner: champion_db_user
--

CREATE FUNCTION public.fn_get_stt_live_recording_job_context(p_job_id character varying) RETURNS TABLE(job_id character varying, user_id uuid, service_code character varying, feature_code character varying, flow character varying, status character varying, current_step character varying, recording_id uuid, language_locale character varying, language_name character varying, audio_format character varying, sample_rate integer, duration_seconds numeric, blob_name text, blob_url text, upload_status character varying, request_payload jsonb, job_metadata jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        j.job_id,
        j.requested_by,
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
        j.metadata
    FROM public.ai_job j
    INNER JOIN public.stt_recording r
        ON r.job_id = j.job_id
    WHERE j.job_id = p_job_id;
END;
$$;


ALTER FUNCTION public.fn_get_stt_live_recording_job_context(p_job_id character varying) OWNER TO champion_db_user;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: champion_db_user
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO champion_db_user;

--
-- Name: sp_complete_stt_live_recording_job_v1(character varying, character varying, character varying, text, character varying, text, text, text, jsonb, jsonb, jsonb, text); Type: PROCEDURE; Schema: public; Owner: champion_db_user
--

CREATE PROCEDURE public.sp_complete_stt_live_recording_job_v1(IN p_job_id character varying, IN p_final_status character varying, IN p_final_step character varying, IN p_completion_message text, IN p_actor_type character varying, IN p_transcription_text text, IN p_summary_text text, IN p_notes_text text, IN p_notes_json jsonb, IN p_mind_map_json jsonb, IN p_raw_result_json jsonb DEFAULT NULL::jsonb, IN p_mind_map_mermaid_code text DEFAULT NULL::text)
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
        mind_map_mermaid_code,
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
        p_mind_map_mermaid_code,
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
        mind_map_mermaid_code = EXCLUDED.mind_map_mermaid_code,
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

    -- 5. Actualizar la tabla principal marcando la fecha de completado
    UPDATE ai_job
    SET
        status = p_final_status,
        current_step = p_final_step,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE job_id = p_job_id;

END;
$$;


ALTER PROCEDURE public.sp_complete_stt_live_recording_job_v1(IN p_job_id character varying, IN p_final_status character varying, IN p_final_step character varying, IN p_completion_message text, IN p_actor_type character varying, IN p_transcription_text text, IN p_summary_text text, IN p_notes_text text, IN p_notes_json jsonb, IN p_mind_map_json jsonb, IN p_raw_result_json jsonb, IN p_mind_map_mermaid_code text) OWNER TO champion_db_user;

--
-- Name: sp_create_stt_live_recording_job_v1(character varying, uuid, character varying, character varying, character varying, character varying, text, character varying, character varying, character varying, character varying, integer, numeric, text, text, character varying, jsonb); Type: PROCEDURE; Schema: public; Owner: champion_db_user
--

CREATE PROCEDURE public.sp_create_stt_live_recording_job_v1(IN p_job_id character varying, IN p_user_id uuid, IN p_service_code character varying, IN p_feature_code character varying, IN p_flow character varying, IN p_initial_status character varying, IN p_initial_message text, IN p_actor_type character varying, IN p_language_locale character varying, IN p_language_name character varying, IN p_audio_format character varying, IN p_sample_rate integer, IN p_duration_seconds numeric, IN p_blob_name text, IN p_blob_url text, IN p_upload_status character varying, IN p_request_payload jsonb DEFAULT NULL::jsonb)
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


ALTER PROCEDURE public.sp_create_stt_live_recording_job_v1(IN p_job_id character varying, IN p_user_id uuid, IN p_service_code character varying, IN p_feature_code character varying, IN p_flow character varying, IN p_initial_status character varying, IN p_initial_message text, IN p_actor_type character varying, IN p_language_locale character varying, IN p_language_name character varying, IN p_audio_format character varying, IN p_sample_rate integer, IN p_duration_seconds numeric, IN p_blob_name text, IN p_blob_url text, IN p_upload_status character varying, IN p_request_payload jsonb) OWNER TO champion_db_user;

--
-- Name: sp_reset_ai_job_for_retry_v1(character varying, character varying); Type: PROCEDURE; Schema: public; Owner: champion_db_user
--

CREATE PROCEDURE public.sp_reset_ai_job_for_retry_v1(IN p_job_id character varying, IN p_actor_type character varying DEFAULT 'backend'::character varying)
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


ALTER PROCEDURE public.sp_reset_ai_job_for_retry_v1(IN p_job_id character varying, IN p_actor_type character varying) OWNER TO champion_db_user;

--
-- Name: sp_save_mindmap_svg_v1(character varying, uuid, text); Type: PROCEDURE; Schema: public; Owner: champion_db_user
--

CREATE PROCEDURE public.sp_save_mindmap_svg_v1(IN p_job_id character varying, IN p_user_id uuid, IN p_svg text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_owner UUID;
BEGIN
    SELECT requested_by INTO v_owner
    FROM ai_job
    WHERE job_id = p_job_id;

    IF v_owner IS NULL THEN
        RAISE EXCEPTION 'JOB_NOT_FOUND';
    END IF;

    IF v_owner != p_user_id THEN
        RAISE EXCEPTION 'USER_MISMATCH';
    END IF;

    UPDATE stt_recording_result
    SET mind_map_svg = p_svg,
        updated_at   = NOW()
    WHERE job_id = p_job_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND';
    END IF;
END;
$$;


ALTER PROCEDURE public.sp_save_mindmap_svg_v1(IN p_job_id character varying, IN p_user_id uuid, IN p_svg text) OWNER TO champion_db_user;

--
-- Name: sp_save_stt_partial_result_v1(character varying, text, text, text, jsonb, jsonb, text); Type: PROCEDURE; Schema: public; Owner: champion_db_user
--

CREATE PROCEDURE public.sp_save_stt_partial_result_v1(IN p_job_id character varying, IN p_transcription_text text DEFAULT NULL::text, IN p_summary_text text DEFAULT NULL::text, IN p_notes_text text DEFAULT NULL::text, IN p_notes_json jsonb DEFAULT NULL::jsonb, IN p_mind_map_json jsonb DEFAULT NULL::jsonb, IN p_mind_map_mermaid_code text DEFAULT NULL::text)
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


ALTER PROCEDURE public.sp_save_stt_partial_result_v1(IN p_job_id character varying, IN p_transcription_text text, IN p_summary_text text, IN p_notes_text text, IN p_notes_json jsonb, IN p_mind_map_json jsonb, IN p_mind_map_mermaid_code text) OWNER TO champion_db_user;

--
-- Name: sp_update_ai_job_status_v1(character varying, character varying, character varying, text, character varying, text, boolean, jsonb, jsonb, character varying); Type: PROCEDURE; Schema: public; Owner: champion_db_user
--

CREATE PROCEDURE public.sp_update_ai_job_status_v1(IN p_job_id character varying, IN p_status character varying, IN p_step_name character varying, IN p_message text DEFAULT NULL::text, IN p_error_code character varying DEFAULT NULL::character varying, IN p_error_message text DEFAULT NULL::text, IN p_retryable boolean DEFAULT NULL::boolean, IN p_steps_snapshot jsonb DEFAULT NULL::jsonb, IN p_metadata jsonb DEFAULT NULL::jsonb, IN p_actor_type character varying DEFAULT NULL::character varying)
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


ALTER PROCEDURE public.sp_update_ai_job_status_v1(IN p_job_id character varying, IN p_status character varying, IN p_step_name character varying, IN p_message text, IN p_error_code character varying, IN p_error_message text, IN p_retryable boolean, IN p_steps_snapshot jsonb, IN p_metadata jsonb, IN p_actor_type character varying) OWNER TO champion_db_user;

--
-- Name: sync_ai_job_from_history(); Type: FUNCTION; Schema: public; Owner: champion_db_user
--

CREATE FUNCTION public.sync_ai_job_from_history() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.is_current = TRUE THEN

        UPDATE ai_job_status_history
        SET is_current = FALSE
        WHERE job_id = NEW.job_id
          AND is_current = TRUE;

        UPDATE ai_job
        SET
            status = NEW.status,
            current_step = NEW.step_name,
            updated_at = NOW(),

            started_at = CASE
                WHEN NEW.status = 'processing' AND started_at IS NULL
                    THEN NOW()
                ELSE started_at
            END,

            completed_at = CASE
                WHEN NEW.status = 'completed'
                    THEN COALESCE(completed_at, NOW())
                ELSE completed_at
            END,

            failed_at = CASE
                WHEN NEW.status = 'failed'
                    THEN COALESCE(failed_at, NOW())
                ELSE failed_at
            END,

            last_error_code = CASE
                WHEN NEW.status = 'failed'
                    THEN NEW.error_code
                ELSE NULL
            END,

            last_error_message = CASE
                WHEN NEW.status = 'failed'
                    THEN COALESCE(NEW.error_message, NEW.message)
                ELSE NULL
            END,

            last_error_retryable = CASE
                WHEN NEW.status = 'failed'
                    THEN NEW.retryable
                ELSE NULL
            END

        WHERE job_id = NEW.job_id;

    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.sync_ai_job_from_history() OWNER TO champion_db_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_job; Type: TABLE; Schema: public; Owner: champion_db_user
--

CREATE TABLE public.ai_job (
    job_id character varying(100) DEFAULT ('job_'::text || (gen_random_uuid())::text) NOT NULL,
    flow character varying(100) NOT NULL,
    service_code character varying(50) NOT NULL,
    feature_code character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'queued'::character varying NOT NULL,
    current_step character varying(100),
    polling_url text,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    requested_by uuid NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    failed_at timestamp with time zone,
    last_error_code character varying(100),
    last_error_message text,
    last_error_retryable boolean,
    request_payload jsonb,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_ai_job_status CHECK (((status)::text = ANY (ARRAY[('queued'::character varying)::text, ('processing'::character varying)::text, ('completed'::character varying)::text, ('failed'::character varying)::text])))
);


ALTER TABLE public.ai_job OWNER TO champion_db_user;

--
-- Name: ai_job_status_history; Type: TABLE; Schema: public; Owner: champion_db_user
--

CREATE TABLE public.ai_job_status_history (
    id_history uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id character varying(100) NOT NULL,
    status character varying(50) NOT NULL,
    step_name character varying(100),
    message text,
    error_code character varying(100),
    error_message text,
    error_field text,
    retryable boolean,
    steps_snapshot jsonb,
    metadata jsonb,
    is_current boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    created_by_type character varying(30) DEFAULT 'system'::character varying NOT NULL,
    CONSTRAINT chk_ai_job_status_history_created_by_type CHECK (((created_by_type)::text = ANY (ARRAY[('user'::character varying)::text, ('system'::character varying)::text, ('backend'::character varying)::text, ('azure_function'::character varying)::text, ('worker'::character varying)::text]))),
    CONSTRAINT chk_ai_job_status_history_status CHECK (((status)::text = ANY (ARRAY[('queued'::character varying)::text, ('processing'::character varying)::text, ('completed'::character varying)::text, ('failed'::character varying)::text])))
);


ALTER TABLE public.ai_job_status_history OWNER TO champion_db_user;

--
-- Name: sec_user; Type: TABLE; Schema: public; Owner: champion_db_user
--

CREATE TABLE public.sec_user (
    user_id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(100),
    email character varying(255) NOT NULL,
    display_name character varying(150),
    first_name character varying(100),
    last_name character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    must_change_password boolean DEFAULT false NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    phone character varying(20),
    location character varying(50),
    occupation character varying(50),
    avatar_url character varying(255)
);


ALTER TABLE public.sec_user OWNER TO champion_db_user;

--
-- Name: sec_user_password; Type: TABLE; Schema: public; Owner: champion_db_user
--

CREATE TABLE public.sec_user_password (
    user_password_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    password_hash text NOT NULL,
    password_algorithm character varying(50) DEFAULT 'bcrypt'::character varying NOT NULL,
    password_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    failed_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_sec_user_password_failed_attempts CHECK ((failed_attempts >= 0))
);


ALTER TABLE public.sec_user_password OWNER TO champion_db_user;

--
-- Name: stt_recording; Type: TABLE; Schema: public; Owner: champion_db_user
--

CREATE TABLE public.stt_recording (
    recording_id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id character varying(100) NOT NULL,
    user_id uuid NOT NULL,
    language_locale character varying(20) DEFAULT 'es-CL'::character varying NOT NULL,
    language_name character varying(100),
    audio_format character varying(20) NOT NULL,
    sample_rate integer,
    duration_seconds numeric(10,3),
    blob_name text,
    blob_url text,
    upload_id character varying(100),
    upload_status character varying(50) DEFAULT 'initialized'::character varying NOT NULL,
    size_bytes bigint,
    checksum_sha256 character varying(128),
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_stt_recording_audio_format CHECK (((audio_format)::text = ANY (ARRAY[('webm'::character varying)::text, ('mp4'::character varying)::text, ('m4a'::character varying)::text, ('mp3'::character varying)::text, ('wav'::character varying)::text, ('ogg'::character varying)::text]))),
    CONSTRAINT chk_stt_recording_duration CHECK (((duration_seconds IS NULL) OR ((duration_seconds >= (1)::numeric) AND (duration_seconds <= (10800)::numeric)))),
    CONSTRAINT chk_stt_recording_sample_rate CHECK (((sample_rate IS NULL) OR (sample_rate = ANY (ARRAY[8000, 16000, 44100, 48000])))),
    CONSTRAINT chk_stt_recording_size_bytes CHECK (((size_bytes IS NULL) OR (size_bytes >= 0))),
    CONSTRAINT chk_stt_recording_upload_status CHECK (((upload_status)::text = ANY (ARRAY[('initialized'::character varying)::text, ('uploading'::character varying)::text, ('uploaded'::character varying)::text, ('validated'::character varying)::text, ('failed'::character varying)::text, ('expired'::character varying)::text])))
);


ALTER TABLE public.stt_recording OWNER TO champion_db_user;

--
-- Name: stt_recording_result; Type: TABLE; Schema: public; Owner: champion_db_user
--

CREATE TABLE public.stt_recording_result (
    result_id uuid DEFAULT gen_random_uuid() NOT NULL,
    recording_id uuid NOT NULL,
    job_id character varying(100) NOT NULL,
    transcription_text text,
    summary_text text,
    notes_text text,
    notes_json jsonb,
    mind_map_json jsonb,
    raw_result_json jsonb,
    generated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    mind_map_mermaid_code text,
    mind_map_svg text,
    CONSTRAINT chk_stt_recording_result_has_content CHECK (((transcription_text IS NOT NULL) OR (summary_text IS NOT NULL) OR (notes_text IS NOT NULL) OR (notes_json IS NOT NULL) OR (mind_map_json IS NOT NULL) OR (raw_result_json IS NOT NULL)))
);


ALTER TABLE public.stt_recording_result OWNER TO champion_db_user;

--
-- Name: vw_ai_job_current_status; Type: VIEW; Schema: public; Owner: champion_db_user
--

CREATE VIEW public.vw_ai_job_current_status AS
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
     LEFT JOIN public.ai_job_status_history h ON ((((h.job_id)::text = (j.job_id)::text) AND (h.is_current = true))));


ALTER VIEW public.vw_ai_job_current_status OWNER TO champion_db_user;

--
-- Name: vw_stt_recording_result; Type: VIEW; Schema: public; Owner: champion_db_user
--

CREATE VIEW public.vw_stt_recording_result AS
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
    result.updated_at AS result_updated_at,
    result.mind_map_mermaid_code,
    result.mind_map_svg
   FROM ((public.stt_recording r
     JOIN public.ai_job j ON (((j.job_id)::text = (r.job_id)::text)))
     LEFT JOIN public.stt_recording_result result ON (((result.recording_id = r.recording_id) AND ((result.job_id)::text = (r.job_id)::text))));


ALTER VIEW public.vw_stt_recording_result OWNER TO champion_db_user;

--
-- Name: ai_job ai_job_pkey; Type: CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.ai_job
    ADD CONSTRAINT ai_job_pkey PRIMARY KEY (job_id);


--
-- Name: ai_job_status_history ai_job_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.ai_job_status_history
    ADD CONSTRAINT ai_job_status_history_pkey PRIMARY KEY (id_history);


--
-- Name: sec_user_password sec_user_password_pkey; Type: CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.sec_user_password
    ADD CONSTRAINT sec_user_password_pkey PRIMARY KEY (user_password_id);


--
-- Name: sec_user sec_user_pkey; Type: CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.sec_user
    ADD CONSTRAINT sec_user_pkey PRIMARY KEY (user_id);


--
-- Name: stt_recording stt_recording_pkey; Type: CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.stt_recording
    ADD CONSTRAINT stt_recording_pkey PRIMARY KEY (recording_id);


--
-- Name: stt_recording_result stt_recording_result_pkey; Type: CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.stt_recording_result
    ADD CONSTRAINT stt_recording_result_pkey PRIMARY KEY (result_id);


--
-- Name: stt_recording unique_job_id; Type: CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.stt_recording
    ADD CONSTRAINT unique_job_id UNIQUE (job_id);


--
-- Name: ai_job uq_ai_job_job_requested_by; Type: CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.ai_job
    ADD CONSTRAINT uq_ai_job_job_requested_by UNIQUE (job_id, requested_by);


--
-- Name: stt_recording uq_stt_recording_job; Type: CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.stt_recording
    ADD CONSTRAINT uq_stt_recording_job UNIQUE (job_id);


--
-- Name: stt_recording uq_stt_recording_recording_job; Type: CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.stt_recording
    ADD CONSTRAINT uq_stt_recording_recording_job UNIQUE (recording_id, job_id);


--
-- Name: stt_recording_result uq_stt_recording_result_job; Type: CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.stt_recording_result
    ADD CONSTRAINT uq_stt_recording_result_job UNIQUE (job_id);


--
-- Name: stt_recording_result uq_stt_recording_result_recording; Type: CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.stt_recording_result
    ADD CONSTRAINT uq_stt_recording_result_recording UNIQUE (recording_id);


--
-- Name: idx_ai_job_created_at; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_ai_job_created_at ON public.ai_job USING btree (created_at DESC);


--
-- Name: idx_ai_job_flow; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_ai_job_flow ON public.ai_job USING btree (flow);


--
-- Name: idx_ai_job_requested_by; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_ai_job_requested_by ON public.ai_job USING btree (requested_by);


--
-- Name: idx_ai_job_service_feature; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_ai_job_service_feature ON public.ai_job USING btree (service_code, feature_code);


--
-- Name: idx_ai_job_status; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_ai_job_status ON public.ai_job USING btree (status);


--
-- Name: idx_ai_job_status_history_created_at; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_ai_job_status_history_created_at ON public.ai_job_status_history USING btree (created_at DESC);


--
-- Name: idx_ai_job_status_history_job_id; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_ai_job_status_history_job_id ON public.ai_job_status_history USING btree (job_id);


--
-- Name: idx_ai_job_status_history_status; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_ai_job_status_history_status ON public.ai_job_status_history USING btree (status);


--
-- Name: idx_sec_user_is_active; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_sec_user_is_active ON public.sec_user USING btree (is_active);


--
-- Name: idx_sec_user_password_user_id; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_sec_user_password_user_id ON public.sec_user_password USING btree (user_id);


--
-- Name: idx_stt_recording_created_at; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_stt_recording_created_at ON public.stt_recording USING btree (created_at DESC);


--
-- Name: idx_stt_recording_job_id; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_stt_recording_job_id ON public.stt_recording USING btree (job_id);


--
-- Name: idx_stt_recording_result_created_at; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_stt_recording_result_created_at ON public.stt_recording_result USING btree (created_at DESC);


--
-- Name: idx_stt_recording_result_job_id; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_stt_recording_result_job_id ON public.stt_recording_result USING btree (job_id);


--
-- Name: idx_stt_recording_result_recording_id; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_stt_recording_result_recording_id ON public.stt_recording_result USING btree (recording_id);


--
-- Name: idx_stt_recording_upload_status; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_stt_recording_upload_status ON public.stt_recording USING btree (upload_status);


--
-- Name: idx_stt_recording_user_id; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_stt_recording_user_id ON public.stt_recording USING btree (user_id);


--
-- Name: uq_ai_job_status_history_current; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE UNIQUE INDEX uq_ai_job_status_history_current ON public.ai_job_status_history USING btree (job_id) WHERE (is_current = true);


--
-- Name: uq_sec_user_email_lower; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE UNIQUE INDEX uq_sec_user_email_lower ON public.sec_user USING btree (lower((email)::text));


--
-- Name: uq_sec_user_password_active; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE UNIQUE INDEX uq_sec_user_password_active ON public.sec_user_password USING btree (user_id) WHERE (is_active = true);


--
-- Name: uq_sec_user_username_lower; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE UNIQUE INDEX uq_sec_user_username_lower ON public.sec_user USING btree (lower((username)::text)) WHERE (username IS NOT NULL);


--
-- Name: ai_job trg_ai_job_updated_at; Type: TRIGGER; Schema: public; Owner: champion_db_user
--

CREATE TRIGGER trg_ai_job_updated_at BEFORE UPDATE ON public.ai_job FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: sec_user_password trg_sec_user_password_updated_at; Type: TRIGGER; Schema: public; Owner: champion_db_user
--

CREATE TRIGGER trg_sec_user_password_updated_at BEFORE UPDATE ON public.sec_user_password FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: sec_user trg_sec_user_updated_at; Type: TRIGGER; Schema: public; Owner: champion_db_user
--

CREATE TRIGGER trg_sec_user_updated_at BEFORE UPDATE ON public.sec_user FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: stt_recording_result trg_stt_recording_result_updated_at; Type: TRIGGER; Schema: public; Owner: champion_db_user
--

CREATE TRIGGER trg_stt_recording_result_updated_at BEFORE UPDATE ON public.stt_recording_result FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: stt_recording trg_stt_recording_updated_at; Type: TRIGGER; Schema: public; Owner: champion_db_user
--

CREATE TRIGGER trg_stt_recording_updated_at BEFORE UPDATE ON public.stt_recording FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: ai_job fk_ai_job_requested_by; Type: FK CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.ai_job
    ADD CONSTRAINT fk_ai_job_requested_by FOREIGN KEY (requested_by) REFERENCES public.sec_user(user_id);


--
-- Name: ai_job_status_history fk_ai_job_status_history_created_by; Type: FK CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.ai_job_status_history
    ADD CONSTRAINT fk_ai_job_status_history_created_by FOREIGN KEY (created_by) REFERENCES public.sec_user(user_id) ON DELETE SET NULL;


--
-- Name: ai_job_status_history fk_ai_job_status_history_job; Type: FK CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.ai_job_status_history
    ADD CONSTRAINT fk_ai_job_status_history_job FOREIGN KEY (job_id) REFERENCES public.ai_job(job_id) ON DELETE CASCADE;


--
-- Name: sec_user fk_sec_user_created_by; Type: FK CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.sec_user
    ADD CONSTRAINT fk_sec_user_created_by FOREIGN KEY (created_by) REFERENCES public.sec_user(user_id) ON DELETE SET NULL;


--
-- Name: sec_user_password fk_sec_user_password_user; Type: FK CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.sec_user_password
    ADD CONSTRAINT fk_sec_user_password_user FOREIGN KEY (user_id) REFERENCES public.sec_user(user_id) ON DELETE CASCADE;


--
-- Name: sec_user fk_sec_user_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.sec_user
    ADD CONSTRAINT fk_sec_user_updated_by FOREIGN KEY (updated_by) REFERENCES public.sec_user(user_id) ON DELETE SET NULL;


--
-- Name: stt_recording fk_stt_recording_job; Type: FK CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.stt_recording
    ADD CONSTRAINT fk_stt_recording_job FOREIGN KEY (job_id) REFERENCES public.ai_job(job_id) ON DELETE CASCADE;


--
-- Name: stt_recording fk_stt_recording_job_user; Type: FK CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.stt_recording
    ADD CONSTRAINT fk_stt_recording_job_user FOREIGN KEY (job_id, user_id) REFERENCES public.ai_job(job_id, requested_by);


--
-- Name: stt_recording_result fk_stt_recording_result_recording_job; Type: FK CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.stt_recording_result
    ADD CONSTRAINT fk_stt_recording_result_recording_job FOREIGN KEY (recording_id, job_id) REFERENCES public.stt_recording(recording_id, job_id) ON DELETE CASCADE;


--
-- Name: stt_recording fk_stt_recording_user; Type: FK CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.stt_recording
    ADD CONSTRAINT fk_stt_recording_user FOREIGN KEY (user_id) REFERENCES public.sec_user(user_id);


--
-- PostgreSQL database dump complete
--

\unrestrict FZlacDUVTabc8ZfoTG05Udf08v989LggHiGUkcIyN5EVPWNuz80x7hqlv5MtPqC

