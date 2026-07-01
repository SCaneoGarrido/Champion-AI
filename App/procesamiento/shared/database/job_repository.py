import json
import logging
from typing import Optional

from shared.database.db_client import call_procedure, query_function
from shared.utils.constants import ACTOR_TYPE, JobStatus, ProcessingStep


logger = logging.getLogger(__name__)


def can_process_job(job_id: str) -> dict:
    """
    Llama fn_can_process_ai_job. Guard de idempotencia — primer paso obligatorio del pipeline.

    Devuelve dict con:
      can_process (bool)  — si el job puede procesarse
      reason (str | None) — JOB_NOT_FOUND | JOB_ALREADY_COMPLETED | JOB_ALREADY_FAILED | INVALID_JOB_STATUS
      current_status (str | None)
    """
    rows = query_function(
        "SELECT * FROM fn_can_process_ai_job(%s)",
        (job_id,),
    )
    if not rows:
        return {"can_process": False, "reason": "EMPTY_RESULT", "current_status": None}
    return rows[0]


def get_stt_job_context(job_id: str) -> Optional[dict]:
    """
    Llama fn_get_stt_live_recording_job_context.

    Devuelve el contexto completo del job (blob_url, language_locale, audio_format, etc.)
    o None si el job no existe.
    """
    rows = query_function(
        "SELECT * FROM fn_get_stt_live_recording_job_context(%s)",
        (job_id,),
    )
    return rows[0] if rows else None


def update_job_status(
    job_id: str,
    status: str,
    step_name: str,
    message: Optional[str] = None,
    error_code: Optional[str] = None,
    error_message: Optional[str] = None,
    retryable: Optional[bool] = None,
) -> None:
    """
    Llama sp_update_ai_job_status_v1.

    Usar para:
      - Inicio de cada paso: status=JobStatus.PROCESSING, step_name=ProcessingStep.*
      - Fallo en cualquier paso: status=JobStatus.FAILED, error_code=ErrorCode.*
    """
    call_procedure(
        """
        CALL sp_update_ai_job_status_v1(
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        """,
        (
            job_id,
            status,
            step_name,
            message,
            error_code,
            error_message,
            retryable,
            None,       # p_steps_snapshot
            None,       # p_metadata
            ACTOR_TYPE,
        ),
    )


def complete_stt_job(
    job_id: str,
    transcription_text: str,
    summary_text: str,
    notes_text: str,
    notes_json: dict,
    mind_map_json: dict,
    raw_result_json: Optional[dict] = None,
) -> None:
    """
    Llama sp_complete_stt_live_recording_job_v1.

    Persiste todos los resultados de IA en stt_recording_result y marca el job como completed.
    El SP lanza excepción si el recording_id no existe para el job.
    """
    call_procedure(
        """
        CALL sp_complete_stt_live_recording_job_v1(
            %s, %s, %s, %s, %s,
            %s, %s, %s,
            %s::jsonb, %s::jsonb, %s::jsonb
        )
        """,
        (
            job_id,
            JobStatus.COMPLETED,
            ProcessingStep.MIND_MAP,
            "Procesamiento completado exitosamente",
            ACTOR_TYPE,
            transcription_text,
            summary_text,
            notes_text,
            json.dumps(notes_json, ensure_ascii=False),
            json.dumps(mind_map_json, ensure_ascii=False),
            json.dumps(raw_result_json, ensure_ascii=False) if raw_result_json else None,
        ),
    )


def get_partial_results(job_id: str) -> dict:
    """
    Retorna los resultados parciales ya guardados en stt_recording_result para un job.
    Útil en reintento para saber qué pasos ya completaron y no repetirlos.

    Devuelve dict con solo los campos que tienen valor (sin None).
    """
    rows = query_function(
        "SELECT transcription_text, summary_text, notes_text, notes_json, mind_map_json "
        "FROM stt_recording_result WHERE job_id = %s",
        (job_id,),
    )
    if not rows:
        return {}
    row = rows[0]
    return {k: v for k, v in row.items() if v is not None}


def save_partial_result(
    job_id: str,
    transcription_text: Optional[str] = None,
    summary_text: Optional[str] = None,
    notes_text: Optional[str] = None,
    notes_json: Optional[dict] = None,
    mind_map_json: Optional[dict] = None,
) -> None:
    """
    Llama sp_save_stt_partial_result_v1.

    Persiste resultados de IA paso a paso para permitir reintento desde el paso que falló.
    El SP usa COALESCE — los campos NULL no sobreescriben valores existentes.
    """
    call_procedure(
        """
        CALL sp_save_stt_partial_result_v1(
            %s, %s, %s, %s, %s::jsonb, %s::jsonb
        )
        """,
        (
            job_id,
            transcription_text,
            summary_text,
            notes_text,
            json.dumps(notes_json, ensure_ascii=False) if notes_json is not None else None,
            json.dumps(mind_map_json, ensure_ascii=False) if mind_map_json is not None else None,
        ),
    )
