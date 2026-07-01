import logging

import azure.durable_functions as df

from shared.database.job_repository import (
    can_process_job,
    get_partial_results,
    get_stt_job_context,
    update_job_status as db_update_status,
)

logger = logging.getLogger(__name__)

bp = df.Blueprint()


@bp.activity_trigger(input_name="job_id")
def check_and_get_context(job_id: str) -> dict:
    """
    Guard de idempotencia + obtención del contexto del job + resultados parciales.

    Retorna:
      can_process (bool)
      job_context (dict | None)  — blob_url, audio_format, language_locale
      partial_results (dict)     — pasos ya completados en intentos anteriores
                                   (transcription_text, summary_text, notes_text,
                                    notes_json, mind_map_json) — solo campos con valor
    """
    check = can_process_job(job_id)
    if not check.get("can_process"):
        logger.info(
            "Job %s descartado — razón: %s (estado: %s)",
            job_id, check.get("reason"), check.get("current_status"),
        )
        return {"can_process": False, "job_context": None, "partial_results": {}}

    ctx = get_stt_job_context(job_id)
    if not ctx:
        logger.error("Contexto no encontrado para job %s", job_id)
        return {"can_process": False, "job_context": None, "partial_results": {}}

    partial = get_partial_results(job_id)
    if partial:
        reused_steps = list(partial.keys())
        logger.info("Job %s — resultados previos encontrados: %s", job_id, reused_steps)

    return {
        "can_process": True,
        "job_context": {
            "blob_url": str(ctx["blob_url"]),
            "audio_format": str(ctx["audio_format"]),
            "language_locale": str(ctx["language_locale"]),
        },
        "partial_results": partial,
    }


@bp.activity_trigger(input_name="status_payload")
def set_job_status(status_payload: dict) -> None:
    """
    Actualiza el estado del job en BD (processing o failed).
    Absorbe errores de BD para no propagar fallos de logging al orquestador.
    """
    try:
        db_update_status(
            job_id=status_payload["job_id"],
            status=status_payload["status"],
            step_name=status_payload["step"],
            message=status_payload.get("message"),
            error_code=status_payload.get("error_code"),
            error_message=status_payload.get("error_message"),
            retryable=status_payload.get("retryable", False),
        )
    except Exception as exc:
        logger.exception(
            "No se pudo actualizar estado del job %s: %s", status_payload.get("job_id"), exc
        )
