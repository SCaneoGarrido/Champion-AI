import logging

import azure.durable_functions as df

from shared.services.mermaid_converter import mind_map_json_to_mermaid
from shared.utils.constants import ErrorCode, JobStatus, ProcessingStep

logger = logging.getLogger(__name__)

bp = df.Blueprint()


@bp.orchestration_trigger(context_name="context")
def stt_live_recording(context: df.DurableOrchestrationContext):
    """
    Orquesta el pipeline STT live_recording como Durable Function.

    Soporta reintento inteligente: si un paso ya completó en un intento anterior,
    el resultado se carga desde stt_recording_result y el paso se omite.
    Esto evita recobrar costos de Azure Speech o Azure OpenAI en reintentos.
    """
    job_id: str = context.get_input()

    # ── 1. Guard + contexto + resultados parciales previos ───────────────────────
    check = yield context.call_activity("check_and_get_context", job_id)
    if not check["can_process"]:
        return

    ctx     = check["job_context"]
    partial = check.get("partial_results", {})

    # ── 2. Transcripción ─────────────────────────────────────────────────────────
    transcription_text = partial.get("transcription_text")

    if transcription_text:
        logger.info("Job %s — transcripción reutilizada (salto de paso)", job_id)
    else:
        yield context.call_activity("set_job_status", {
            "job_id": job_id,
            "status": JobStatus.PROCESSING,
            "step": ProcessingStep.TRANSCRIPTION,
        })
        try:
            transcription_text = yield context.call_activity("transcribe_audio", {
                "blob_url": ctx["blob_url"],
                "audio_format": ctx["audio_format"],
                "language_locale": ctx["language_locale"],
            })
        except Exception as exc:
            yield context.call_activity("set_job_status", {
                "job_id": job_id,
                "status": JobStatus.FAILED,
                "step": ProcessingStep.TRANSCRIPTION,
                "error_code": ErrorCode.STT_ENGINE_UNAVAILABLE,
                "error_message": str(exc),
            })
            return
        try:
            yield context.call_activity("save_partial_result_activity", {
                "job_id": job_id,
                "transcription_text": transcription_text,
                "step": ProcessingStep.TRANSCRIPTION,
            })
        except Exception as exc:
            logger.warning("Job %s — guardado parcial de transcripción falló: %s", job_id, exc)

    # ── 3. Resumen ───────────────────────────────────────────────────────────────
    summary_text = partial.get("summary_text")

    if summary_text:
        logger.info("Job %s — resumen reutilizado (salto de paso)", job_id)
    else:
        yield context.call_activity("set_job_status", {
            "job_id": job_id,
            "status": JobStatus.PROCESSING,
            "step": ProcessingStep.SUMMARY,
        })
        try:
            summary_text = yield context.call_activity("generate_summary_activity", transcription_text)
        except Exception as exc:
            yield context.call_activity("set_job_status", {
                "job_id": job_id,
                "status": JobStatus.FAILED,
                "step": ProcessingStep.SUMMARY,
                "error_code": ErrorCode.OPENAI_UNAVAILABLE,
                "error_message": str(exc),
            })
            return
        try:
            yield context.call_activity("save_partial_result_activity", {
                "job_id": job_id,
                "summary_text": summary_text,
                "step": ProcessingStep.SUMMARY,
            })
        except Exception as exc:
            logger.warning("Job %s — guardado parcial de resumen falló: %s", job_id, exc)

    # ── 4. Notas (Markdown + JSON) ───────────────────────────────────────────────
    notes_text = partial.get("notes_text")
    notes_json = partial.get("notes_json")

    if notes_text and notes_json:
        logger.info("Job %s — notas reutilizadas (salto de paso)", job_id)
        notes_result = {"notes_text": notes_text, "notes_json": notes_json}
    else:
        yield context.call_activity("set_job_status", {
            "job_id": job_id,
            "status": JobStatus.PROCESSING,
            "step": ProcessingStep.NOTES,
        })
        try:
            notes_result = yield context.call_activity("generate_notes_activity", transcription_text)
        except Exception as exc:
            yield context.call_activity("set_job_status", {
                "job_id": job_id,
                "status": JobStatus.FAILED,
                "step": ProcessingStep.NOTES,
                "error_code": ErrorCode.OPENAI_UNAVAILABLE,
                "error_message": str(exc),
            })
            return
        try:
            yield context.call_activity("save_partial_result_activity", {
                "job_id": job_id,
                "notes_text": notes_result["notes_text"],
                "notes_json": notes_result["notes_json"],
                "step": ProcessingStep.NOTES,
            })
        except Exception as exc:
            logger.warning("Job %s — guardado parcial de notas falló: %s", job_id, exc)

    # ── 5. Mapa mental ───────────────────────────────────────────────────────────
    mind_map_json = partial.get("mind_map_json")

    # Presentation Layer: proyección determinística de mind_map_json → sintaxis Mermaid.
    # Código puro/sin I/O — corre directo en el orquestador, NO es una Activity ni una
    # etapa de IA (ver R-AZURE-12 en App/rules/azure.md y ADR-008 en el Knowledge Vault).
    # Es una transformación gratuita: no vale la pena cachearla por separado del árbol,
    # se recalcula tanto si mind_map_json es nuevo como si se reutiliza de un reintento.

    if mind_map_json:
        logger.info("Job %s — mapa mental reutilizado (salto de paso)", job_id)
        mind_map_mermaid_code = mind_map_json_to_mermaid(mind_map_json)
    else:
        yield context.call_activity("set_job_status", {
            "job_id": job_id,
            "status": JobStatus.PROCESSING,
            "step": ProcessingStep.MIND_MAP,
        })
        try:
            mind_map_json = yield context.call_activity("generate_mind_map_activity", transcription_text)
        except Exception as exc:
            yield context.call_activity("set_job_status", {
                "job_id": job_id,
                "status": JobStatus.FAILED,
                "step": ProcessingStep.MIND_MAP,
                "error_code": ErrorCode.OPENAI_UNAVAILABLE,
                "error_message": str(exc),
            })
            return

        mind_map_mermaid_code = mind_map_json_to_mermaid(mind_map_json)

        try:
            yield context.call_activity("save_partial_result_activity", {
                "job_id": job_id,
                "mind_map_json": mind_map_json,
                "mind_map_mermaid_code": mind_map_mermaid_code,
                "step": ProcessingStep.MIND_MAP,
            })
        except Exception as exc:
            logger.warning("Job %s — guardado parcial de mapa mental falló: %s", job_id, exc)

    # ── 6. Persistir resultado final y marcar completado ─────────────────────────
    # SP idempotente (ON CONFLICT DO UPDATE) — reintento seguro ante fallo de red o BD
    retry_policy = df.RetryOptions(
        first_retry_interval_in_milliseconds=5000,
        max_number_of_attempts=3,
    )
    try:
        yield context.call_activity_with_retry(
            "complete_job_activity",
            retry_policy,
            {
                "job_id": job_id,
                "transcription_text": transcription_text,
                "summary_text": summary_text,
                "notes_text": notes_result["notes_text"],
                "notes_json": notes_result["notes_json"],
                "mind_map_json": mind_map_json,
                "mind_map_mermaid_code": mind_map_mermaid_code,
            },
        )
    except Exception as exc:
        yield context.call_activity("set_job_status", {
            "job_id": job_id,
            "status": JobStatus.FAILED,
            "step": ProcessingStep.MIND_MAP,
            "error_code": ErrorCode.INTERNAL_ERROR,
            "error_message": str(exc),
        })
