"""Validate backend dependencies and initialize the local SQLite schema."""

from __future__ import annotations

import importlib
from pathlib import Path
import sys


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


REQUIRED_MODULES = ("fastapi", "uvicorn", "httpx", "sqlalchemy", "alembic")


def main() -> int:
    missing = []
    for module_name in REQUIRED_MODULES:
        try:
            importlib.import_module(module_name)
        except ImportError:
            missing.append(module_name)
    if missing:
        print("FastAPI backend dependencies are missing.")
        print("Run:")
        print("python -m pip install -r requirements.txt")
        print(f"Missing modules: {', '.join(missing)}")
        return 1

    from lunar_comm_sim.persistence import init_database

    init_database()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
