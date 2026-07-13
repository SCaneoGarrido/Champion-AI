import json
import logging
from pathlib import Path
from typing import Optional

from openai import AzureOpenAI

from config import Config

logger = logging.getLogger(__name__)

_PROMPTS_DIR = Path(__file__).parent.parent.parent / "prompts"

_MAX_TOKENS_TEXT = 16384   # razonamiento + output para respuestas de texto
_MAX_TOKENS_JSON = 16384   # razonamiento + output para respuestas JSON

_client: Optional[AzureOpenAI] = None


# ---------------------------------------------------------------------------
# Infraestructura interna
# ---------------------------------------------------------------------------

def _get_client() -> AzureOpenAI:
    global _client
    if _client is None:
        _client = AzureOpenAI(
            api_key=Config.OPENAI_KEY,
            azure_endpoint=Config.OPENAI_ENDPOINT,
            api_version=Config.OPENAI_API_VERSION,
        )
    return _client


def _load_prompt(filename: str) -> str:
    return (_PROMPTS_DIR / filename).read_text(encoding="utf-8")


def _inject_transcription(prompt_template: str, transcription: str) -> str:
    return prompt_template.replace("{{TRANSCRIPTION}}", transcription)


def _append_custom_instructions(user_message: str, custom_instructions: Optional[str]) -> str:
    """
    Agrega instrucciones propias del usuario al final del prompt, cuando el
    step se está reprocesando desde /jobs/{job_id}/reprocess (ver ADR-010).
    No modifica los archivos .md de prompts — se agrega como sección extra.
    """
    if not custom_instructions:
        return user_message
    return (
        f"{user_message}\n\n"
        "--------------------------------------------------\n"
        "INSTRUCCIONES ADICIONALES DEL USUARIO\n"
        "--------------------------------------------------\n"
        f"{custom_instructions}"
    )


def _call(system_prompt: str, user_message: str, max_tokens: int) -> str:
    client = _get_client()
    response = client.chat.completions.create(
        model=Config.OPENAI_DEPLOYMENT,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        max_completion_tokens=max_tokens,
    )
    choice = response.choices[0]
    finish_reason = choice.finish_reason

    if finish_reason == "length":
        raise RuntimeError(
            f"Respuesta cortada por límite de tokens (max_completion_tokens={max_tokens}). "
            "Aumentar el límite o reducir el input."
        )

    content = choice.message.content
    if content is None:
        refusal = getattr(choice.message, "refusal", None)
        raise RuntimeError(
            f"Modelo rechazó la solicitud (finish_reason={finish_reason}): {refusal}"
        )

    result = content.strip()
    if not result:
        raise RuntimeError(
            f"Modelo devolvió contenido vacío (finish_reason={finish_reason}). "
            "Posible agotamiento de tokens de razonamiento."
        )

    logger.debug("OpenAI response OK — finish_reason=%s, chars=%d", finish_reason, len(result))
    return result


def _parse_json(raw: str) -> dict:
    """
    Parsea JSON de la respuesta del modelo.
    Elimina posibles code fences (```json ... ```) si el modelo las incluye.
    """
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        start = 1
        end = len(lines) - 1 if lines[-1].strip() == "```" else len(lines)
        cleaned = "\n".join(lines[start:end]).strip()

    if not cleaned:
        raise ValueError(
            f"JSON vacío tras limpiar code fences. Raw recibido: {repr(raw[:300])}"
        )

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"JSON inválido — {exc}. Primeros 300 chars: {repr(cleaned[:300])}"
        ) from exc


# ---------------------------------------------------------------------------
# API pública
# ---------------------------------------------------------------------------

def generate_summary(transcription: str, custom_instructions: Optional[str] = None) -> str:
    """
    Genera un resumen ejecutivo en Markdown.
    Usa el prompt summary.md con el system prompt de Champion AI.
    `custom_instructions` (opcional): instrucciones propias del usuario al
    reprocesar este step (ver ADR-010) — se agregan al final del prompt.
    """
    logger.info("Generando resumen ejecutivo")
    system_prompt = _load_prompt("system.md")
    user_message = _inject_transcription(_load_prompt("summary.md"), transcription)
    user_message = _append_custom_instructions(user_message, custom_instructions)
    return _call(system_prompt, user_message, _MAX_TOKENS_TEXT)


def generate_notes(transcription: str, custom_instructions: Optional[str] = None) -> str:
    """
    Genera notas estructuradas en Markdown.
    Usa el prompt notes.md con el system prompt de Champion AI.
    """
    logger.info("Generando notas (Markdown)")
    system_prompt = _load_prompt("system.md")
    user_message = _inject_transcription(_load_prompt("notes.md"), transcription)
    user_message = _append_custom_instructions(user_message, custom_instructions)
    return _call(system_prompt, user_message, _MAX_TOKENS_TEXT)


def generate_notes_json(transcription: str, custom_instructions: Optional[str] = None) -> dict:
    """
    Genera notas estructuradas en formato JSON.
    Usa el prompt notes_json.md — misma estructura que notes.md pero en JSON.
    Retorna un dict con keys: title, overview, concepts, examples, important_details, key_takeaways.
    """
    logger.info("Generando notas (JSON)")
    system_prompt = _load_prompt("system.md")
    user_message = _inject_transcription(_load_prompt("notes_json.md"), transcription)
    user_message = _append_custom_instructions(user_message, custom_instructions)
    raw = _call(system_prompt, user_message, _MAX_TOKENS_JSON)
    return _parse_json(raw)


def generate_mind_map(transcription: str, custom_instructions: Optional[str] = None) -> dict:
    """
    Genera un mapa mental jerárquico en formato JSON.
    Usa el prompt mind_map.md.
    Retorna un dict con keys: title, nodes (árbol con name/children).
    """
    logger.info("Generando mapa mental (JSON)")
    system_prompt = _load_prompt("system.md")
    user_message = _inject_transcription(_load_prompt("mind_map.md"), transcription)
    user_message = _append_custom_instructions(user_message, custom_instructions)
    raw = _call(system_prompt, user_message, _MAX_TOKENS_JSON)
    return _parse_json(raw)
