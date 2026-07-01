import json
import logging
import re
import time

import requests

from config import Config

logger = logging.getLogger(__name__)

_API_VERSION = "2024-11-15"
_REQUEST_TIMEOUT_SECONDS = 600  # 10 min — suficiente para audio de hasta ~4h

# Formatos soportados nativamente por la Fast Transcription API
_CONTENT_TYPES = {
    "webm": "audio/webm",
    "mp3":  "audio/mpeg",
    "m4a":  "audio/mp4",
    "mp4":  "audio/mp4",
    "wav":  "audio/wav",
    "ogg":  "audio/ogg",
    "flac": "audio/flac",
    "aac":  "audio/aac",
}


def _endpoint() -> str:
    return (
        f"https://{Config.SPEECH_REGION}.api.cognitive.microsoft.com"
        f"/speechtotext/transcriptions:transcribe"
        f"?api-version={_API_VERSION}"
    )


def _parse_duration_secs(iso: str) -> float:
    """Convierte duración ISO 8601 parcial (PT14M30.5S) a segundos."""
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?", iso or "")
    if not m:
        return 0.0
    h, min_, s = m.groups(default="0")
    return int(h) * 3600 + int(min_) * 60 + float(s)


def fast_transcribe(audio_bytes: bytes, audio_format: str, language_locale: str) -> str:
    """
    Transcribe audio usando Azure AI Speech Fast Transcription REST API.

    Envía el audio completo en una única HTTP POST y devuelve la transcripción completa.
    No requiere conversión previa: acepta WebM, MP3, M4A, OGG, WAV, FLAC y AAC de forma nativa.

    Ventaja vs Continuous Recognition: procesa a ~10–50× velocidad real en lugar de ≤1×.

    Lanza RuntimeError en caso de error HTTP, timeout o respuesta vacía.
    """
    content_type = _CONTENT_TYPES.get(audio_format.lower(), "application/octet-stream")
    definition = json.dumps(
        {"locales": [language_locale], "profanityFilterMode": "None", "channels": [0]},
        ensure_ascii=False,
    )

    logger.info(
        "Fast Transcription iniciada — idioma: %s | formato: %s | %.2f MB",
        language_locale, audio_format, len(audio_bytes) / 1_048_576,
    )
    t0 = time.monotonic()

    try:
        resp = requests.post(
            _endpoint(),
            headers={"Ocp-Apim-Subscription-Key": Config.SPEECH_KEY},
            files=[
                ("audio",      (f"audio.{audio_format}", audio_bytes, content_type)),
                ("definition", (None, definition, "application/json")),
            ],
            timeout=_REQUEST_TIMEOUT_SECONDS,
        )
    except requests.Timeout:
        raise RuntimeError(
            f"Fast Transcription timeout después de {_REQUEST_TIMEOUT_SECONDS}s"
        )
    except requests.RequestException as exc:
        raise RuntimeError(f"Error de red en Fast Transcription: {exc}") from exc

    elapsed = time.monotonic() - t0

    # Errores HTTP con contexto específico para diagnóstico
    if resp.status_code == 400:
        raise RuntimeError(
            f"Fast Transcription: audio inválido o formato no soportado "
            f"(formato={audio_format}) — {resp.text[:400]}"
        )
    if resp.status_code == 401:
        raise RuntimeError("Fast Transcription: SPEECH_KEY inválida o no autorizada")
    if resp.status_code == 413:
        raise RuntimeError(
            f"Fast Transcription: archivo supera el límite de 200 MB "
            f"({len(audio_bytes) / 1_048_576:.1f} MB)"
        )
    if resp.status_code == 429:
        raise RuntimeError("Fast Transcription: cuota de requests excedida (429 rate limit)")
    if not resp.ok:
        raise RuntimeError(
            f"Fast Transcription error {resp.status_code}: {resp.text[:400]}"
        )

    data = resp.json()
    combined = data.get("combinedPhrases", [])
    if not combined:
        raise RuntimeError(
            "Fast Transcription: respuesta sin contenido (combinedPhrases vacío)"
        )

    transcription = combined[0].get("text", "").strip()
    if not transcription:
        raise RuntimeError("Fast Transcription: texto transcripto vacío")

    audio_secs   = _parse_duration_secs(data.get("duration", ""))
    phrase_count = len(data.get("phrases", []))
    speed        = (audio_secs / elapsed) if elapsed > 0 and audio_secs > 0 else 0.0

    logger.info(
        "Fast Transcription completada — audio: %.1fs | procesado en: %.1fs | "
        "velocidad: ×%.1f | frases: %d | chars: %d",
        audio_secs, elapsed, speed, phrase_count, len(transcription),
    )
    return transcription
