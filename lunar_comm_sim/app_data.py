"""Local application data paths for the desktop FastAPI backend."""

from __future__ import annotations

import os
from pathlib import Path


APP_DATA_ENV = "LUNAR_APP_DATA_DIR"


def app_data_dir() -> Path:
    """Return the local writable app data directory."""

    configured = os.environ.get(APP_DATA_ENV)
    if configured:
        return Path(configured).expanduser().resolve()
    local_app_data = os.environ.get("LOCALAPPDATA")
    if local_app_data:
        return Path(local_app_data) / "LunarCommMVP"
    return Path.home() / ".lunar_comm_mvp"


def database_path() -> Path:
    return app_data_dir() / "lunar_comm_mvp.sqlite3"


def runs_dir() -> Path:
    return app_data_dir() / "runs"


def logs_dir() -> Path:
    return app_data_dir() / "logs"


def backups_dir() -> Path:
    return app_data_dir() / "backups"


def temp_dir() -> Path:
    return app_data_dir() / "tmp"


def ensure_app_data_dirs() -> Path:
    root = app_data_dir()
    for path in (root, runs_dir(), logs_dir(), backups_dir(), temp_dir()):
        path.mkdir(parents=True, exist_ok=True)
    return root
