import logging


def get_logger(name: str = "champion_ai") -> logging.Logger:
    return logging.getLogger(name)


def log_with_context(logger: logging.Logger, level: int, context: str, msg: str) -> None:
    logger.log(level, "[%s] %s", context, msg)
