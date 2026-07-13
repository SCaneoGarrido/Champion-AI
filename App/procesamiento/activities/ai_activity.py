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


@bp.activity_trigger(input_name="generation_input")
def generate_summary_activity(generation_input: dict) -> str:
    """
    Genera el resumen ejecutivo en Markdown via Azure OpenAI.
    `generation_input`: {"transcription": str, "custom_instructions": str | None}
    """
    return oai_summary(
        generation_input["transcription"],
        generation_input.get("custom_instructions"),
    )


@bp.activity_trigger(input_name="generation_input")
def generate_notes_activity(generation_input: dict) -> dict:
    """
    Genera notas en Markdown y JSON via Azure OpenAI.
    `generation_input`: {"transcription": str, "custom_instructions": str | None}
    Retorna {"notes_text": str, "notes_json": dict}.
    """
    transcription = generation_input["transcription"]
    custom_instructions = generation_input.get("custom_instructions")
    return {
        "notes_text": oai_notes(transcription, custom_instructions),
        "notes_json": generate_notes_json(transcription, custom_instructions),
    }


@bp.activity_trigger(input_name="generation_input")
def generate_mind_map_activity(generation_input: dict) -> dict:
    """
    Genera el mapa mental JSON via Azure OpenAI.
    `generation_input`: {"transcription": str, "custom_instructions": str | None}
    """
    return oai_mind_map(
        generation_input["transcription"],
        generation_input.get("custom_instructions"),
    )
