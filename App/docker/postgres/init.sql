--
-- PostgreSQL database dump
--

\restrict FrpMutxCyXqOPfATvtwifN6Z0EI7tbaKfeQMgcOjQodCsr0geINpPVQqgOuCh3b

-- Dumped from database version 18.3 (Debian 18.3-1.pgdg13+1)
-- Dumped by pg_dump version 18.3 (Debian 18.3-1.pgdg13+1)

-- Started on 2026-05-23 21:16:59 -04

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

--
-- TOC entry 2 (class 3079 OID 16655)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 3620 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 279 (class 1255 OID 33352)
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
-- TOC entry 278 (class 1255 OID 33351)
-- Name: fn_get_stt_live_recording_job_context(character varying); Type: FUNCTION; Schema: public; Owner: champion_db_user
--

CREATE FUNCTION public.fn_get_stt_live_recording_job_context(p_job_id character varying) RETURNS TABLE(job_id character varying, user_id uuid, service_code character varying, feature_code character varying, flow character varying, status character varying, current_step character varying, recording_id uuid, language_locale character varying, language_name character varying, audio_format character varying, sample_rate integer, duration_seconds integer, blob_name text, blob_url text, upload_status character varying, request_payload jsonb, job_metadata jsonb)
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


ALTER FUNCTION public.fn_get_stt_live_recording_job_context(p_job_id character varying) OWNER TO champion_db_user;

--
-- TOC entry 265 (class 1255 OID 16693)
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
-- TOC entry 281 (class 1255 OID 33347)
-- Name: sp_complete_stt_live_recording_job_v1(character varying, character varying, character varying, text, character varying, text, text, text, jsonb, jsonb, jsonb); Type: PROCEDURE; Schema: public; Owner: champion_db_user
--

CREATE PROCEDURE public.sp_complete_stt_live_recording_job_v1(IN p_job_id character varying, IN p_final_status character varying, IN p_final_step character varying, IN p_completion_message text, IN p_actor_type character varying, IN p_transcription_text text, IN p_summary_text text, IN p_notes_text text, IN p_notes_json jsonb, IN p_mind_map_json jsonb, IN p_raw_result_json jsonb DEFAULT NULL::jsonb)
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


ALTER PROCEDURE public.sp_complete_stt_live_recording_job_v1(IN p_job_id character varying, IN p_final_status character varying, IN p_final_step character varying, IN p_completion_message text, IN p_actor_type character varying, IN p_transcription_text text, IN p_summary_text text, IN p_notes_text text, IN p_notes_json jsonb, IN p_mind_map_json jsonb, IN p_raw_result_json jsonb) OWNER TO champion_db_user;

--
-- TOC entry 282 (class 1255 OID 33345)
-- Name: sp_create_stt_live_recording_job_v1(character varying, uuid, character varying, character varying, character varying, character varying, text, character varying, character varying, character varying, character varying, integer, integer, text, text, character varying, jsonb); Type: PROCEDURE; Schema: public; Owner: champion_db_user
--

CREATE PROCEDURE public.sp_create_stt_live_recording_job_v1(IN p_job_id character varying, IN p_user_id uuid, IN p_service_code character varying, IN p_feature_code character varying, IN p_flow character varying, IN p_initial_status character varying, IN p_initial_message text, IN p_actor_type character varying, IN p_language_locale character varying, IN p_language_name character varying, IN p_audio_format character varying, IN p_sample_rate integer, IN p_duration_seconds integer, IN p_blob_name text, IN p_blob_url text, IN p_upload_status character varying, IN p_request_payload jsonb DEFAULT NULL::jsonb)
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


ALTER PROCEDURE public.sp_create_stt_live_recording_job_v1(IN p_job_id character varying, IN p_user_id uuid, IN p_service_code character varying, IN p_feature_code character varying, IN p_flow character varying, IN p_initial_status character varying, IN p_initial_message text, IN p_actor_type character varying, IN p_language_locale character varying, IN p_language_name character varying, IN p_audio_format character varying, IN p_sample_rate integer, IN p_duration_seconds integer, IN p_blob_name text, IN p_blob_url text, IN p_upload_status character varying, IN p_request_payload jsonb) OWNER TO champion_db_user;

--
-- TOC entry 280 (class 1255 OID 33346)
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
-- TOC entry 277 (class 1255 OID 16821)
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
-- TOC entry 222 (class 1259 OID 16758)
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
    CONSTRAINT chk_ai_job_status CHECK (((status)::text = ANY ((ARRAY['queued'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


ALTER TABLE public.ai_job OWNER TO champion_db_user;

--
-- TOC entry 223 (class 1259 OID 16791)
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
    CONSTRAINT chk_ai_job_status_history_created_by_type CHECK (((created_by_type)::text = ANY ((ARRAY['user'::character varying, 'system'::character varying, 'backend'::character varying, 'azure_function'::character varying, 'worker'::character varying])::text[]))),
    CONSTRAINT chk_ai_job_status_history_status CHECK (((status)::text = ANY ((ARRAY['queued'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


ALTER TABLE public.ai_job_status_history OWNER TO champion_db_user;

--
-- TOC entry 220 (class 1259 OID 16694)
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
    updated_by uuid
);


ALTER TABLE public.sec_user OWNER TO champion_db_user;

--
-- TOC entry 221 (class 1259 OID 16726)
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
-- TOC entry 224 (class 1259 OID 16823)
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
    duration_seconds integer,
    blob_name text,
    blob_url text,
    upload_id character varying(100),
    upload_status character varying(50) DEFAULT 'initialized'::character varying NOT NULL,
    size_bytes bigint,
    checksum_sha256 character varying(128),
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_stt_recording_audio_format CHECK (((audio_format)::text = ANY ((ARRAY['webm'::character varying, 'mp4'::character varying, 'm4a'::character varying, 'mp3'::character varying, 'wav'::character varying, 'ogg'::character varying])::text[]))),
    CONSTRAINT chk_stt_recording_duration CHECK (((duration_seconds IS NULL) OR ((duration_seconds >= 1) AND (duration_seconds <= 10800)))),
    CONSTRAINT chk_stt_recording_sample_rate CHECK (((sample_rate IS NULL) OR (sample_rate = ANY (ARRAY[8000, 16000, 44100, 48000])))),
    CONSTRAINT chk_stt_recording_size_bytes CHECK (((size_bytes IS NULL) OR (size_bytes >= 0))),
    CONSTRAINT chk_stt_recording_upload_status CHECK (((upload_status)::text = ANY ((ARRAY['initialized'::character varying, 'uploading'::character varying, 'uploaded'::character varying, 'validated'::character varying, 'failed'::character varying, 'expired'::character varying])::text[])))
);


ALTER TABLE public.stt_recording OWNER TO champion_db_user;

--
-- TOC entry 225 (class 1259 OID 16973)
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
    CONSTRAINT chk_stt_recording_result_has_content CHECK (((transcription_text IS NOT NULL) OR (summary_text IS NOT NULL) OR (notes_text IS NOT NULL) OR (notes_json IS NOT NULL) OR (mind_map_json IS NOT NULL) OR (raw_result_json IS NOT NULL)))
);


ALTER TABLE public.stt_recording_result OWNER TO champion_db_user;

--
-- TOC entry 226 (class 1259 OID 17002)
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
-- TOC entry 227 (class 1259 OID 17007)
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
    result.updated_at AS result_updated_at
   FROM ((public.stt_recording r
     JOIN public.ai_job j ON (((j.job_id)::text = (r.job_id)::text)))
     LEFT JOIN public.stt_recording_result result ON (((result.recording_id = r.recording_id) AND ((result.job_id)::text = (r.job_id)::text))));


ALTER VIEW public.vw_stt_recording_result OWNER TO champion_db_user;

--
-- TOC entry 3611 (class 0 OID 16758)
-- Dependencies: 222
-- Data for Name: ai_job; Type: TABLE DATA; Schema: public; Owner: champion_db_user
--

COPY public.ai_job (job_id, flow, service_code, feature_code, status, current_step, polling_url, requested_at, requested_by, started_at, completed_at, failed_at, last_error_code, last_error_message, last_error_retryable, request_payload, metadata, created_at, updated_at) FROM stdin;
job_1681f6cc-aa4d-4222-b83b-1b1f20360697	flow_live_recording	STT	live_recording	queued	\N	/AIServices/Speechv2/jobs/job_1681f6cc-aa4d-4222-b83b-1b1f20360697/status	2026-05-17 15:53:49.316664-04	5e2dc6bd-edf3-434c-ac92-0883b35e3034	\N	\N	\N	\N	\N	\N	{"req_info": {"flow": "flow_live_recording", "job_id": "job_1681f6cc-aa4d-4222-b83b-1b1f20360697", "feature": "live_recording", "service": "STT", "language_info": {"locale": "es-CL", "locale_name": "Spanish (Chile)"}}, "user_info": {"user_id": "5e2dc6bd-edf3-434c-ac92-0883b35e3034"}, "audio_info": {"format": "wav", "blob_url": "https://championaistaccount.blob.core.windows.net/audio/audio/5e2dc6bd-edf3-434c-ac92-0883b35e3034/job_33c9ba80-5fa7-47d6-b5e6-b0b62d767441/job_33c9ba80-5fa7-47d6-b5e6-b0b62d767441.wav?sv=2025-11-05&se=2026-05-16T21%3A13%3A30Z&sr=b&sp=cw&sig=T8Bcyaz11%2FCmxsF6lfwxVzYJaO3P80VBO0WZpFOiD1w%3D", "sample_rate": 16000, "duration_seconds": 3245}}	\N	2026-05-17 15:53:49.316664-04	2026-05-17 15:53:49.316664-04
\.


--
-- TOC entry 3612 (class 0 OID 16791)
-- Dependencies: 223
-- Data for Name: ai_job_status_history; Type: TABLE DATA; Schema: public; Owner: champion_db_user
--

COPY public.ai_job_status_history (id_history, job_id, status, step_name, message, error_code, error_message, error_field, retryable, steps_snapshot, metadata, is_current, created_at, created_by, created_by_type) FROM stdin;
6ee6b21a-16be-4391-a3fb-2c41a5280ed8	job_1681f6cc-aa4d-4222-b83b-1b1f20360697	queued	\N	Job encolado correctamente	\N	\N	\N	\N	\N	\N	t	2026-05-17 15:53:49.316664-04	5e2dc6bd-edf3-434c-ac92-0883b35e3034	backend
\.


--
-- TOC entry 3609 (class 0 OID 16694)
-- Dependencies: 220
-- Data for Name: sec_user; Type: TABLE DATA; Schema: public; Owner: champion_db_user
--

COPY public.sec_user (user_id, username, email, display_name, first_name, last_name, is_active, must_change_password, last_login_at, created_at, created_by, updated_at, updated_by) FROM stdin;
ffce3079-cc13-440a-a3fe-4a316037d5f8	testuser_02@gmail.com	testuser_02@gmail.com	User02 Test02	User02	Test02	t	f	\N	2026-05-10 23:05:13.647-04	\N	2026-05-10 23:05:13.647-04	\N
5e2dc6bd-edf3-434c-ac92-0883b35e3034	testuser_03@gmail.com	testuser_03@gmail.com	User03 Test03	User03	Test03	t	f	\N	2026-05-10 23:05:55.198-04	\N	2026-05-10 23:05:55.198-04	\N
\.


--
-- TOC entry 3610 (class 0 OID 16726)
-- Dependencies: 221
-- Data for Name: sec_user_password; Type: TABLE DATA; Schema: public; Owner: champion_db_user
--

COPY public.sec_user_password (user_password_id, user_id, password_hash, password_algorithm, password_updated_at, failed_attempts, locked_until, is_active, created_at, updated_at) FROM stdin;
b6c3e976-aef8-40b7-9050-3bcbca874f32	ffce3079-cc13-440a-a3fe-4a316037d5f8	$2b$12$w7twvrBSvKzciaMTCTaDw.kW.LjgsLYwLtcm1a0UHbKkOtxqPqFrO	bcrypt	2026-05-10 23:05:13.852-04	0	\N	t	2026-05-10 23:05:13.852-04	2026-05-10 23:05:13.852-04
3a904e02-2928-495f-9661-aac799e621b4	5e2dc6bd-edf3-434c-ac92-0883b35e3034	$2b$12$1lQngmrQzTloHwoj4xJmBuJKWczytX66AeO/PX2EI5t1qXkF2oaku	bcrypt	2026-05-10 23:05:55.404-04	0	\N	t	2026-05-10 23:05:55.404-04	2026-05-10 23:05:55.404-04
\.


--
-- TOC entry 3613 (class 0 OID 16823)
-- Dependencies: 224
-- Data for Name: stt_recording; Type: TABLE DATA; Schema: public; Owner: champion_db_user
--

COPY public.stt_recording (recording_id, job_id, user_id, language_locale, language_name, audio_format, sample_rate, duration_seconds, blob_name, blob_url, upload_id, upload_status, size_bytes, checksum_sha256, expires_at, created_at, updated_at) FROM stdin;
35d4bda6-ed51-401b-8107-d5d86b63f7ad	job_1681f6cc-aa4d-4222-b83b-1b1f20360697	5e2dc6bd-edf3-434c-ac92-0883b35e3034	es-CL	Spanish (Chile)	wav	16000	3245	\N	https://championaistaccount.blob.core.windows.net/audio/audio/5e2dc6bd-edf3-434c-ac92-0883b35e3034/job_33c9ba80-5fa7-47d6-b5e6-b0b62d767441/job_33c9ba80-5fa7-47d6-b5e6-b0b62d767441.wav?sv=2025-11-05&se=2026-05-16T21%3A13%3A30Z&sr=b&sp=cw&sig=T8Bcyaz11%2FCmxsF6lfwxVzYJaO3P80VBO0WZpFOiD1w%3D	\N	uploaded	\N	\N	\N	2026-05-17 15:53:49.316664-04	2026-05-17 15:53:49.316664-04
\.


--
-- TOC entry 3614 (class 0 OID 16973)
-- Dependencies: 225
-- Data for Name: stt_recording_result; Type: TABLE DATA; Schema: public; Owner: champion_db_user
--

COPY public.stt_recording_result (result_id, recording_id, job_id, transcription_text, summary_text, notes_text, notes_json, mind_map_json, raw_result_json, generated_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3410 (class 2606 OID 16779)
-- Name: ai_job ai_job_pkey; Type: CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.ai_job
    ADD CONSTRAINT ai_job_pkey PRIMARY KEY (job_id);


--
-- TOC entry 3419 (class 2606 OID 16806)
-- Name: ai_job_status_history ai_job_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.ai_job_status_history
    ADD CONSTRAINT ai_job_status_history_pkey PRIMARY KEY (id_history);


--
-- TOC entry 3407 (class 2606 OID 16749)
-- Name: sec_user_password sec_user_password_pkey; Type: CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.sec_user_password
    ADD CONSTRAINT sec_user_password_pkey PRIMARY KEY (user_password_id);


--
-- TOC entry 3402 (class 2606 OID 16711)
-- Name: sec_user sec_user_pkey; Type: CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.sec_user
    ADD CONSTRAINT sec_user_pkey PRIMARY KEY (user_id);


--
-- TOC entry 3429 (class 2606 OID 16847)
-- Name: stt_recording stt_recording_pkey; Type: CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.stt_recording
    ADD CONSTRAINT stt_recording_pkey PRIMARY KEY (recording_id);


--
-- TOC entry 3440 (class 2606 OID 16988)
-- Name: stt_recording_result stt_recording_result_pkey; Type: CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.stt_recording_result
    ADD CONSTRAINT stt_recording_result_pkey PRIMARY KEY (result_id);


--
-- TOC entry 3431 (class 2606 OID 33349)
-- Name: stt_recording unique_job_id; Type: CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.stt_recording
    ADD CONSTRAINT unique_job_id UNIQUE (job_id);


--
-- TOC entry 3417 (class 2606 OID 16962)
-- Name: ai_job uq_ai_job_job_requested_by; Type: CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.ai_job
    ADD CONSTRAINT uq_ai_job_job_requested_by UNIQUE (job_id, requested_by);


--
-- TOC entry 3433 (class 2606 OID 16849)
-- Name: stt_recording uq_stt_recording_job; Type: CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.stt_recording
    ADD CONSTRAINT uq_stt_recording_job UNIQUE (job_id);


--
-- TOC entry 3435 (class 2606 OID 16964)
-- Name: stt_recording uq_stt_recording_recording_job; Type: CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.stt_recording
    ADD CONSTRAINT uq_stt_recording_recording_job UNIQUE (recording_id, job_id);


--
-- TOC entry 3442 (class 2606 OID 16992)
-- Name: stt_recording_result uq_stt_recording_result_job; Type: CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.stt_recording_result
    ADD CONSTRAINT uq_stt_recording_result_job UNIQUE (job_id);


--
-- TOC entry 3444 (class 2606 OID 16990)
-- Name: stt_recording_result uq_stt_recording_result_recording; Type: CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.stt_recording_result
    ADD CONSTRAINT uq_stt_recording_result_recording UNIQUE (recording_id);


--
-- TOC entry 3411 (class 1259 OID 16789)
-- Name: idx_ai_job_created_at; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_ai_job_created_at ON public.ai_job USING btree (created_at DESC);


--
-- TOC entry 3412 (class 1259 OID 16787)
-- Name: idx_ai_job_flow; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_ai_job_flow ON public.ai_job USING btree (flow);


--
-- TOC entry 3413 (class 1259 OID 16785)
-- Name: idx_ai_job_requested_by; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_ai_job_requested_by ON public.ai_job USING btree (requested_by);


--
-- TOC entry 3414 (class 1259 OID 16788)
-- Name: idx_ai_job_service_feature; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_ai_job_service_feature ON public.ai_job USING btree (service_code, feature_code);


--
-- TOC entry 3415 (class 1259 OID 16786)
-- Name: idx_ai_job_status; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_ai_job_status ON public.ai_job USING btree (status);


--
-- TOC entry 3420 (class 1259 OID 16819)
-- Name: idx_ai_job_status_history_created_at; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_ai_job_status_history_created_at ON public.ai_job_status_history USING btree (created_at DESC);


--
-- TOC entry 3421 (class 1259 OID 16817)
-- Name: idx_ai_job_status_history_job_id; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_ai_job_status_history_job_id ON public.ai_job_status_history USING btree (job_id);


--
-- TOC entry 3422 (class 1259 OID 16818)
-- Name: idx_ai_job_status_history_status; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_ai_job_status_history_status ON public.ai_job_status_history USING btree (status);


--
-- TOC entry 3400 (class 1259 OID 16724)
-- Name: idx_sec_user_is_active; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_sec_user_is_active ON public.sec_user USING btree (is_active);


--
-- TOC entry 3405 (class 1259 OID 16756)
-- Name: idx_sec_user_password_user_id; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_sec_user_password_user_id ON public.sec_user_password USING btree (user_id);


--
-- TOC entry 3424 (class 1259 OID 16863)
-- Name: idx_stt_recording_created_at; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_stt_recording_created_at ON public.stt_recording USING btree (created_at DESC);


--
-- TOC entry 3425 (class 1259 OID 16861)
-- Name: idx_stt_recording_job_id; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_stt_recording_job_id ON public.stt_recording USING btree (job_id);


--
-- TOC entry 3436 (class 1259 OID 17000)
-- Name: idx_stt_recording_result_created_at; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_stt_recording_result_created_at ON public.stt_recording_result USING btree (created_at DESC);


--
-- TOC entry 3437 (class 1259 OID 16999)
-- Name: idx_stt_recording_result_job_id; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_stt_recording_result_job_id ON public.stt_recording_result USING btree (job_id);


--
-- TOC entry 3438 (class 1259 OID 16998)
-- Name: idx_stt_recording_result_recording_id; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_stt_recording_result_recording_id ON public.stt_recording_result USING btree (recording_id);


--
-- TOC entry 3426 (class 1259 OID 16862)
-- Name: idx_stt_recording_upload_status; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_stt_recording_upload_status ON public.stt_recording USING btree (upload_status);


--
-- TOC entry 3427 (class 1259 OID 16860)
-- Name: idx_stt_recording_user_id; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE INDEX idx_stt_recording_user_id ON public.stt_recording USING btree (user_id);


--
-- TOC entry 3423 (class 1259 OID 16820)
-- Name: uq_ai_job_status_history_current; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE UNIQUE INDEX uq_ai_job_status_history_current ON public.ai_job_status_history USING btree (job_id) WHERE (is_current = true);


--
-- TOC entry 3403 (class 1259 OID 16722)
-- Name: uq_sec_user_email_lower; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE UNIQUE INDEX uq_sec_user_email_lower ON public.sec_user USING btree (lower((email)::text));


--
-- TOC entry 3408 (class 1259 OID 16755)
-- Name: uq_sec_user_password_active; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE UNIQUE INDEX uq_sec_user_password_active ON public.sec_user_password USING btree (user_id) WHERE (is_active = true);


--
-- TOC entry 3404 (class 1259 OID 16723)
-- Name: uq_sec_user_username_lower; Type: INDEX; Schema: public; Owner: champion_db_user
--

CREATE UNIQUE INDEX uq_sec_user_username_lower ON public.sec_user USING btree (lower((username)::text)) WHERE (username IS NOT NULL);


--
-- TOC entry 3457 (class 2620 OID 16790)
-- Name: ai_job trg_ai_job_updated_at; Type: TRIGGER; Schema: public; Owner: champion_db_user
--

CREATE TRIGGER trg_ai_job_updated_at BEFORE UPDATE ON public.ai_job FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3456 (class 2620 OID 16757)
-- Name: sec_user_password trg_sec_user_password_updated_at; Type: TRIGGER; Schema: public; Owner: champion_db_user
--

CREATE TRIGGER trg_sec_user_password_updated_at BEFORE UPDATE ON public.sec_user_password FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3455 (class 2620 OID 16725)
-- Name: sec_user trg_sec_user_updated_at; Type: TRIGGER; Schema: public; Owner: champion_db_user
--

CREATE TRIGGER trg_sec_user_updated_at BEFORE UPDATE ON public.sec_user FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3459 (class 2620 OID 17001)
-- Name: stt_recording_result trg_stt_recording_result_updated_at; Type: TRIGGER; Schema: public; Owner: champion_db_user
--

CREATE TRIGGER trg_stt_recording_result_updated_at BEFORE UPDATE ON public.stt_recording_result FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3458 (class 2620 OID 16864)
-- Name: stt_recording trg_stt_recording_updated_at; Type: TRIGGER; Schema: public; Owner: champion_db_user
--

CREATE TRIGGER trg_stt_recording_updated_at BEFORE UPDATE ON public.stt_recording FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3448 (class 2606 OID 16780)
-- Name: ai_job fk_ai_job_requested_by; Type: FK CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.ai_job
    ADD CONSTRAINT fk_ai_job_requested_by FOREIGN KEY (requested_by) REFERENCES public.sec_user(user_id);


--
-- TOC entry 3449 (class 2606 OID 16812)
-- Name: ai_job_status_history fk_ai_job_status_history_created_by; Type: FK CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.ai_job_status_history
    ADD CONSTRAINT fk_ai_job_status_history_created_by FOREIGN KEY (created_by) REFERENCES public.sec_user(user_id) ON DELETE SET NULL;


--
-- TOC entry 3450 (class 2606 OID 16807)
-- Name: ai_job_status_history fk_ai_job_status_history_job; Type: FK CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.ai_job_status_history
    ADD CONSTRAINT fk_ai_job_status_history_job FOREIGN KEY (job_id) REFERENCES public.ai_job(job_id) ON DELETE CASCADE;


--
-- TOC entry 3445 (class 2606 OID 16712)
-- Name: sec_user fk_sec_user_created_by; Type: FK CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.sec_user
    ADD CONSTRAINT fk_sec_user_created_by FOREIGN KEY (created_by) REFERENCES public.sec_user(user_id) ON DELETE SET NULL;


--
-- TOC entry 3447 (class 2606 OID 16750)
-- Name: sec_user_password fk_sec_user_password_user; Type: FK CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.sec_user_password
    ADD CONSTRAINT fk_sec_user_password_user FOREIGN KEY (user_id) REFERENCES public.sec_user(user_id) ON DELETE CASCADE;


--
-- TOC entry 3446 (class 2606 OID 16717)
-- Name: sec_user fk_sec_user_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.sec_user
    ADD CONSTRAINT fk_sec_user_updated_by FOREIGN KEY (updated_by) REFERENCES public.sec_user(user_id) ON DELETE SET NULL;


--
-- TOC entry 3451 (class 2606 OID 16850)
-- Name: stt_recording fk_stt_recording_job; Type: FK CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.stt_recording
    ADD CONSTRAINT fk_stt_recording_job FOREIGN KEY (job_id) REFERENCES public.ai_job(job_id) ON DELETE CASCADE;


--
-- TOC entry 3452 (class 2606 OID 16965)
-- Name: stt_recording fk_stt_recording_job_user; Type: FK CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.stt_recording
    ADD CONSTRAINT fk_stt_recording_job_user FOREIGN KEY (job_id, user_id) REFERENCES public.ai_job(job_id, requested_by);


--
-- TOC entry 3454 (class 2606 OID 16993)
-- Name: stt_recording_result fk_stt_recording_result_recording_job; Type: FK CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.stt_recording_result
    ADD CONSTRAINT fk_stt_recording_result_recording_job FOREIGN KEY (recording_id, job_id) REFERENCES public.stt_recording(recording_id, job_id) ON DELETE CASCADE;


--
-- TOC entry 3453 (class 2606 OID 16855)
-- Name: stt_recording fk_stt_recording_user; Type: FK CONSTRAINT; Schema: public; Owner: champion_db_user
--

ALTER TABLE ONLY public.stt_recording
    ADD CONSTRAINT fk_stt_recording_user FOREIGN KEY (user_id) REFERENCES public.sec_user(user_id);


-- Completed on 2026-05-23 21:17:00 -04

--
-- PostgreSQL database dump complete
--

\unrestrict FrpMutxCyXqOPfATvtwifN6Z0EI7tbaKfeQMgcOjQodCsr0geINpPVQqgOuCh3b

