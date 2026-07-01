import logging

import azure.durable_functions as df

from shared.services.blob_service import download_audio_bytes
from shared.services.speech_service import fast_transcribe

logger = logging.getLogger(__name__)

bp = df.Blueprint()


@bp.activity_trigger(input_name="audio_payload")
def transcribe_audio(audio_payload: dict) -> str:
    """
    Descarga el audio desde Blob Storage y lo transcribe con Fast Transcription.
    El audio se envía en su formato original — sin conversión previa a WAV.
    """
    blob_url     = audio_payload["blob_url"]
    audio_format = audio_payload["audio_format"]
    language     = audio_payload["language_locale"]

    audio_bytes = download_audio_bytes(blob_url)
    return fast_transcribe(audio_bytes, audio_format, language)
