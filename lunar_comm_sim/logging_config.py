"""Structured-ish local logging for the FastAPI backend."""

from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler

from lunar_comm_sim.app_data import ensure_app_data_dirs, logs_dir


def configure_logging() -> None:
    ensure_app_data_dirs()
    root = logging.getLogger("lunar_comm_sim")
    root.setLevel(logging.INFO)
    if any(isinstance(handler, RotatingFileHandler) for handler in root.handlers):
        return
    formatter = logging.Formatter(
        "%(asctime)s %(levelname)s request_id=%(request_id)s %(name)s %(message)s",
        defaults={"request_id": "-"},
    )
    app_handler = RotatingFileHandler(logs_dir() / "app.log", maxBytes=2_000_000, backupCount=5, encoding="utf-8")
    app_handler.setFormatter(formatter)
    app_handler.setLevel(logging.INFO)
    error_handler = RotatingFileHandler(logs_dir() / "error.log", maxBytes=2_000_000, backupCount=5, encoding="utf-8")
    error_handler.setFormatter(formatter)
    error_handler.setLevel(logging.ERROR)
    root.addHandler(app_handler)
    root.addHandler(error_handler)


def log_client_error(payload: dict, request_id: str | None) -> None:
    ensure_app_data_dirs()
    logger = logging.getLogger("lunar_comm_sim.client")
    handler = RotatingFileHandler(logs_dir() / "client-errors.log", maxBytes=2_000_000, backupCount=5, encoding="utf-8")
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s request_id=%(request_id)s %(message)s"))
    logger.addHandler(handler)
    try:
        logger.error("%s", payload, extra={"request_id": request_id or "-"})
    finally:
        logger.removeHandler(handler)
        handler.close()
