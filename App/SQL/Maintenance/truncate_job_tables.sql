-- ============================================================
-- truncate_job_tables
-- Vacía por completo las tablas de jobs y resultados de IA en champion_db.
--
-- Alcance: ai_job, ai_job_status_history, stt_recording, stt_recording_result.
-- No afecta sec_user ni sec_user_password (no tienen relación con jobs).
--
-- Las 4 tablas se truncan en un único TRUNCATE porque
-- ai_job_status_history, stt_recording y stt_recording_result
-- referencian a ai_job/stt_recording con ON DELETE CASCADE — Postgres
-- exige truncar juntas las tablas relacionadas por FK en la misma sentencia.
--
-- Uso (dev local, contenedor postgres_db):
--   docker exec postgres_db psql -U champion_db_user -d champion_db -f - < truncate_job_tables.sql
-- ============================================================

TRUNCATE TABLE
    public.ai_job_status_history,
    public.stt_recording_result,
    public.stt_recording,
    public.ai_job;

-- Verificación: las 4 tablas deben quedar en 0 filas
SELECT 'ai_job' AS table_name, count(*) FROM public.ai_job
UNION ALL
SELECT 'ai_job_status_history', count(*) FROM public.ai_job_status_history
UNION ALL
SELECT 'stt_recording', count(*) FROM public.stt_recording
UNION ALL
SELECT 'stt_recording_result', count(*) FROM public.stt_recording_result;
