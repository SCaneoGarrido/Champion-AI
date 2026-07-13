-- ============================================================
-- sp_soft_delete_stt_job_v1
-- Marca un Knowledge Pack (job) como eliminado sin borrar filas de BD
-- ni el audio en Blob Storage.
--
-- Reglas:
--   · Solo el dueño del job (p_user_id = ai_job.requested_by) puede eliminarlo
--   · Idempotente: si ya estaba eliminado, no hace nada y retorna sin error
--   · No valida el status del job — se puede eliminar en cualquier estado
--     (queued/processing/completed/failed); un pipeline en curso no se
--     detiene, solo deja de ser visible para el usuario
--   · No inserta entrada en ai_job_status_history — is_deleted/deleted_at
--     son su propio rastro de auditoría; la eliminación no es un estado
--     del pipeline de procesamiento
-- ============================================================

CREATE OR REPLACE PROCEDURE sp_soft_delete_stt_job_v1(
    p_job_id     VARCHAR(100),
    p_user_id    UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_is_deleted BOOLEAN;
BEGIN
    SELECT is_deleted INTO v_is_deleted
    FROM ai_job
    WHERE job_id = p_job_id
      AND requested_by = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'JOB_NOT_FOUND';
    END IF;

    IF v_is_deleted THEN
        RETURN; -- ya eliminado — no-op idempotente
    END IF;

    UPDATE ai_job
    SET is_deleted = TRUE,
        deleted_at = NOW(),
        updated_at = NOW()
    WHERE job_id = p_job_id;
END;
$$;
