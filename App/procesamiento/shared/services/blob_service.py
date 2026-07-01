import logging
from urllib.parse import urlparse

from azure.storage.blob import BlobClient

from config import Config

logger = logging.getLogger(__name__)


def download_audio_bytes(blob_url: str) -> bytes:
    """
    Descarga el audio fuente desde el contenedor 'audio' como bytes en memoria.

    La blob_url es la URL permanente almacenada en stt_recording.blob_url.
    Se autentica con la connection string de la Function (no SAS).
    """
    blob_name = _extract_blob_name(blob_url)
    logger.info("Descargando audio fuente: %s", blob_name)

    client = BlobClient.from_connection_string(
        conn_str=Config.AZURE_STORAGE_CONNECTION_STRING,
        container_name=Config.AZURE_BLOB_CONTAINER_NAME,
        blob_name=blob_name,
    )
    audio_bytes = client.download_blob().readall()
    logger.info("Audio descargado: %d bytes (%.2f MB)", len(audio_bytes), len(audio_bytes) / 1_048_576)
    return audio_bytes


def _extract_blob_name(blob_url: str) -> str:
    """
    Extrae el blob path de la URL permanente, eliminando el nombre del contenedor.
    Ej: https://account.blob.core.windows.net/audio/user/job/file.webm
        → user/job/file.webm
    """
    url_path = urlparse(blob_url).path   # /audio/user/job/file.webm
    parts = url_path.lstrip("/").split("/", 1)
    return parts[1] if len(parts) > 1 else url_path
