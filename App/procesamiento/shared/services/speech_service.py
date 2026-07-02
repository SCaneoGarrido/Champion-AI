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


def _detect_audio_format(audio_bytes: bytes) -> str:
    """Detecta el formato real del audio por magic bytes y codec interno."""
    if len(audio_bytes) < 12:
        return "unknown (too short)"
    h = audio_bytes[:12]
    if h[4:8] == b"ftyp":
        brand = h[8:12]
        # Scan first 256 KB for codec atom
        sample = audio_bytes[:262144]
        if b"alac" in sample:
            codec = "ALAC"
        elif b"mp4a" in sample:
            codec = "AAC/mp4a"
        else:
            codec = "codec-unknown"
        return f"mp4/m4a (brand={brand} codec={codec})"
    if h[:4] == b"caff":
        return "caf (Apple Core Audio)"
    if h[:4] == b"RIFF" and h[8:12] == b"WAVE":
        return "wav"
    if h[:3] == b"ID3" or (h[0] == 0xFF and h[1] & 0xE0 == 0xE0):
        return "mp3"
    if h[:4] == b"fLaC":
        return "flac"
    if h[:4] == b"OggS":
        return "ogg"
    if h[:4] == b"\x1aE\xdf\xa3":
        return "webm/mkv"
    return f"unknown (hex={h[:8].hex()})"


def fast_transcribe(audio_bytes: bytes, audio_format: str, language_locale: str) -> str:
    """
    Transcribe audio usando Azure AI Speech Fast Transcription REST API.

    Envía el audio completo en una única HTTP POST y devuelve la transcripción completa.
    No requiere conversión previa: acepta WebM, MP3, M4A, OGG, WAV, FLAC y AAC de forma nativa.

    Ventaja vs Continuous Recognition: procesa a ~10–50× velocidad real en lugar de ≤1×.

    Lanza RuntimeError en caso de error HTTP, timeout o respuesta vacía.
    """
    content_type = _CONTENT_TYPES.get(audio_format.lower(), "application/octet-stream")
    # channels omitido: la Fast Transcription API activa separación por canal de speaker
    # cuando channels está presente, lo que rompe grabaciones de micrófono estándar (mono/stereo mixto).
    definition = json.dumps(
        {"locales": [language_locale], "profanityFilterMode": "None"},
        ensure_ascii=False,
    )

    detected = _detect_audio_format(audio_bytes)
    logger.info(
        "Fast Transcription iniciada — idioma: %s | formato declarado: %s | formato real: %s | %.2f MB",
        language_locale, audio_format, detected, len(audio_bytes) / 1_048_576,
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
