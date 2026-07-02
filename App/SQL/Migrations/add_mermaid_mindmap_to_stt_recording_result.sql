-- ═══════════════════════════════════════════════════════════════════════════
-- Migración: Presentation Layer — Mermaid mind maps
-- Nuevas columnas en stt_recording_result:
--   mind_map_mermaid_code — sintaxis Mermaid, proyección determinística de mind_map_json (no IA)
--   mind_map_svg          — SVG renderizado y cacheado por el cliente (nunca fuente de verdad)
-- Ver App/Knowledge/ADR/ADR-008-client-side-rendering.md
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.stt_recording_result
    ADD COLUMN IF NOT EXISTS mind_map_mermaid_code TEXT,
    ADD COLUMN IF NOT EXISTS mind_map_svg           TEXT;

-- sp_complete_stt_live_recording_job_v1 y sp_save_stt_partial_result_v1 se actualizan
-- vía CREATE OR REPLACE PROCEDURE (App/SQL/Stored Procedures/) — no requieren migración
-- de datos, solo redefinición de firma (nuevo parámetro con DEFAULT NULL, no rompe
-- llamadas existentes). sp_save_mindmap_svg_v1 es un procedimiento nuevo, también
-- vía CREATE OR REPLACE PROCEDURE.

-- vw_stt_recording_result expone las columnas nuevas. CREATE OR REPLACE VIEW solo permite
-- agregar columnas al final de la lista (no se puede insertar en medio sin DROP+CREATE),
-- por eso van al final en vez de junto a mind_map_json.
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
    result.updated_at AS result_updated_at,
    result.mind_map_mermaid_code,
    result.mind_map_svg
   FROM ((public.stt_recording r
     JOIN public.ai_job j ON (((j.job_id)::text = (r.job_id)::text)))
     LEFT JOIN public.stt_recording_result result ON (((result.recording_id = r.recording_id) AND ((result.job_id)::text = (r.job_id)::text))));

COMMIT;
