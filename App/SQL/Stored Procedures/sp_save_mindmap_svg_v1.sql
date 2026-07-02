-- ============================================================
-- sp_save_mindmap_svg_v1
-- Cachea el SVG del mapa mental renderizado por el cliente
-- (Mermaid → SVG vía WebView, ver App/Knowledge/ADR/ADR-008-client-side-rendering.md).
--
-- El SVG nunca es la fuente de verdad — es una proyección cacheada de
-- mind_map_mermaid_code, regenerable en cualquier momento por el cliente.
-- Verifica ownership del job antes de escribir.
-- ============================================================

CREATE OR REPLACE PROCEDURE sp_save_mindmap_svg_v1(
    p_job_id   VARCHAR(100),
    p_user_id  UUID,
    p_svg      TEXT
)
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
