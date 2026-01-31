"""Logging configuration for the application."""
import logging
from pathlib import Path
from logging.handlers import RotatingFileHandler

LOG_FILE_PATH: Path = Path(__file__).parents[4] / "logs" / "zc_api.log"


class LoggingAlreadyConfiguredError(Exception):
    """Raised when setup_logging is called more than once."""
    pass


def setup_logging(log_level: int = logging.INFO) -> None:
    """
    Configures the logging system with a standard format and level. Call this in your
    __main__.py so that it is specific to that module.
    
    Args:
        log_level (int): The logging level to set. Defaults to `logging.INFO`.
    
    Logging Format:
        - %(levelname)s: The log level (e.g., INFO, DEBUG).
        - %(asctime)s: The timestamp of the log message (formatted as YYYY-MM-DD HH:MM:SS).
        - %(module)s: The name of the module where the log was generated.
        - %(message)s: The log message.
        - %(pathname)s: The full path of the module generating the log.
        - %(lineno)d: The line number where the log was generated.
    
    Raises:
        LoggingAlreadyConfiguredError: If setup_logging is called more than once.
    
    Example:
        ```python
        # In __main__.py module.
        import logging
        from zc_api.common.logging import setup_logging
        
        setup_logging(log_level=logging.INFO)
        logger = logging.getLogger(__name__)
        logger.info("Application starting...")
        ```
        
        INFO 2024-12-16 11:31:06 [main] Application starting... (main.py:10)
    
    Remarks:
        DEBUG < INFO < WARNING < ERROR < CRITICAL. Logs below the specified level will not appear.
    """
    if getattr(setup_logging, "_is_initialized", False):
        raise LoggingAlreadyConfiguredError("Cannot call logging.setup_logging once.")
    
    log_format = "%(levelname)s %(asctime)s [%(module)s] %(message)s (%(pathname)s:%(lineno)d)"
    date_format = "%Y-%m-%d %H:%M:%S"
    logging.basicConfig(level=log_level, format=log_format, datefmt=date_format)
    
    try:
        log_path = Path(LOG_FILE_PATH)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        file_handler = RotatingFileHandler(
            log_path,
            maxBytes=1_000_000,
            backupCount=5,
            encoding="utf-8"
        )
        file_handler.setFormatter(logging.Formatter(log_format, date_format))
        logging.getLogger().addHandler(file_handler)
    except Exception:
        logging.getLogger(__name__).exception("Failed to configure file logging. path=%s", LOG_FILE_PATH)
    
    setup_logging._is_initialized = True
