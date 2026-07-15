from __future__ import annotations

import pytest
from pathlib import Path
from uuid import uuid4

from lunar_comm_sim.persistence.database import reset_engine_for_tests


@pytest.fixture(autouse=True)
def isolated_app_data(monkeypatch):
    from lunar_comm_sim.api import main as api_main
    from lunar_comm_sim.api.session_store import SimulationSessionStore

    if api_main.job_manager is not None:
        api_main.job_manager.shutdown()
    api_main.job_manager = None
    api_main.store = SimulationSessionStore()
    root = Path("outputs") / "tmp_pytest" / "app_data_tests" / uuid4().hex
    root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("LUNAR_APP_DATA_DIR", str(root))
    reset_engine_for_tests()
    yield
    if api_main.job_manager is not None:
        api_main.job_manager.shutdown()
    api_main.job_manager = None
    reset_engine_for_tests()
