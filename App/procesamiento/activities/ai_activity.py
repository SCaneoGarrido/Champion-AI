import logging

import azure.durable_functions as df

from shared.services.openai_service import (
    generate_mind_map as oai_mind_map,
    generate_notes as oai_notes,
    generate_notes_json,
    generate_summary as oai_summary,
)

logger = logging.getLogger(__name__)

bp = df.Blueprint()


@bp.activity_trigger(input_name="transcription")
def generate_summary_activity(transcription: str) -> str:
    """Genera el resumen ejecutivo en Markdown via Azure OpenAI."""
    return oai_summary(transcription)


@bp.activity_trigger(input_name="transcription")
def generate_notes_activity(transcription: str) -> dict:
    """
    Genera notas en Markdown y JSON via Azure OpenAI.
    Retorna {"notes_text": str, "notes_json": dict}.
    """
    return {
        "notes_text": oai_notes(transcription),
        "notes_json": generate_notes_json(transcription),
    }


@bp.activity_trigger(input_name="transcription")
def generate_mind_map_activity(transcription: str) -> dict:
    """Genera el mapa mental JSON via Azure OpenAI."""
    return oai_mind_map(transcription)
