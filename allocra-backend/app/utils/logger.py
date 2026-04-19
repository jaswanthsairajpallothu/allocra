import logging, sys
from app.core.config import settings

def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers: return logger
    level = logging.DEBUG if settings.APP_DEBUG else logging.INFO
    logger.setLevel(level)
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    handler.setFormatter(logging.Formatter("%(asctime)s | %(levelname)-8s | %(name)s | %(message)s", "%Y-%m-%d %H:%M:%S"))
    logger.addHandler(handler)
    return logger
