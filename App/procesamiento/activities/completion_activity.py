import logging

import azure.durable_functions as df

from shared.database.job_repository import complete_stt_job, save_partial_result

logger = logging.getLogger(__name__)

bp = df.Blueprint()


@bp.activity_trigger(input_name="completion_payload")
def complete_job_activity(completion_payload: dict) -> None:
    """
    Persiste todos los resultados del job y lo marca como completado.
    Llama a sp_complete_stt_live_recording_job_v1 (idempotente — ON CONFLICT DO UPDATE).
    """
    complete_stt_job(
        job_id=completion_payload["job_id"],
        transcription_text=completion_payload["transcription_text"],
        summary_text=completion_payload["summary_text"],
        notes_text=completion_payload["notes_text"],
        notes_json=completion_payload["notes_json"],
        mind_map_json=completion_payload["mind_map_json"],
        mind_map_mermaid_code=completion_payload.get("mind_map_mermaid_code"),
    )
    logger.info("Job %s completado y persistido", completion_payload["job_id"])


@bp.activity_trigger(input_name="partial_payload")
def save_partial_result_activity(partial_payload: dict) -> None:
    """
    Persiste el resultado de un paso de IA en stt_recording_result.
    Usa COALESCE — no sobreescribe pasos previamente guardados.
    Permite que un reintento retome desde el paso que falló.
    """
    job_id = partial_payload["job_id"]
    step   = partial_payload.get("step", "?")
    save_partial_result(
        job_id=job_id,
        transcription_text=partial_payload.get("transcription_text"),
        summary_text=partial_payload.get("summary_text"),
        notes_text=partial_payload.get("notes_text"),
        notes_json=partial_payload.get("notes_json"),
        mind_map_json=partial_payload.get("mind_map_json"),
        mind_map_mermaid_code=partial_payload.get("mind_map_mermaid_code"),
    )
    logger.info("Resultado parcial guardado — job %s, paso: %s", job_id, step)
