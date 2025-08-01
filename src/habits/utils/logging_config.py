"""Logging configuration using structlog."""

import logging
import sys
from typing import Any, Dict, Optional

import structlog


def configure_logging(
    level: str = "INFO", json_format: bool = False, service_name: str = "habits-tracker"
) -> None:
    """Configure structured logging for the application.

    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        json_format: If True, use JSON format for logs. If False, use human-readable format.
        service_name: Name of the service for log context
    """
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, level.upper()),
    )

    # Configure structlog
    processors = [
        structlog.stdlib.filter_by_level,
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.dev.set_exc_info,
    ]

    if json_format:
        processors.extend(
            [structlog.processors.dict_tracebacks, structlog.processors.JSONRenderer()]
        )
    else:
        processors.extend([structlog.dev.ConsoleRenderer(colors=True)])

    structlog.configure(
        processors=processors,  # type: ignore[arg-type]
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        context_class=dict,
        cache_logger_on_first_use=True,
    )

    # Add service name to global context
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(service=service_name)


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Get a structured logger instance.

    Args:
        name: Logger name (typically __name__)

    Returns:
        Configured structlog logger
    """
    return structlog.get_logger(name)


def log_service_action(
    logger: structlog.stdlib.BoundLogger, action: str, **context: Any
) -> Dict[str, Any]:
    """Helper to log service actions with consistent structure.

    Args:
        logger: The logger instance
        action: Description of the action being performed
        **context: Additional context to include in the log

    Returns:
        Context dictionary for use in completion logging
    """
    log_context = {"action": action, **context}

    logger.info("Service action started", **log_context)
    return log_context


def log_service_completion(
    logger: structlog.stdlib.BoundLogger,
    context: Dict[str, Any],
    success: bool = True,
    error: Optional[Exception] = None,
    **additional_context: Any,
) -> None:
    """Helper to log service action completion.

    Args:
        logger: The logger instance
        context: Context from log_service_action
        success: Whether the action succeeded
        error: Exception if action failed
        **additional_context: Additional context to include
    """
    final_context = {**context, "success": success, **additional_context}

    if success:
        logger.info("Service action completed", **final_context)
    else:
        logger.error(
            "Service action failed",
            error=str(error) if error else "Unknown error",
            **final_context,
        )
