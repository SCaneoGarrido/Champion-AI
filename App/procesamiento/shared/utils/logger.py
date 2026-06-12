import logging
import os
from datetime import datetime
from config import Config

def setup_logger(name="decoanimaciones", level=logging.DEBUG):
    """
    Configura y retorna un logger para la aplicación.
    Los logs se mostrarán en consola y se guardarán en un archivo con nombre fecha_ejecution.log en la carpeta especificada.
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)

    # Obtener la carpeta de logs desde la variable de entorno
    logs_folder = Config.LOGS_FOLDER
    os.makedirs(logs_folder, exist_ok=True)

    # Nombre del archivo: YYYY-MM-DD_ejecution.log (solo fecha)
    fecha = datetime.now().strftime("%Y-%m-%d")
    log_filename = os.path.join(logs_folder, f"{fecha}_ejecution.log")

    # Evita agregar múltiples handlers si ya existen
    if not logger.handlers:
        formatter = logging.Formatter(
            '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
        )

        ch = logging.StreamHandler()
        ch.setLevel(level)
        ch.setFormatter(formatter)
        logger.addHandler(ch)

        fh = logging.FileHandler(log_filename, encoding='utf-8')
        fh.setLevel(level)
        fh.setFormatter(formatter)
        logger.addHandler(fh)

    return logger

def log_with_context(logger, level, contexto, msg):
    mensaje = f"[{contexto}] {msg}"
    logger.log(level, mensaje)