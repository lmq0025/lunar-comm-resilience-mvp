from __future__ import annotations

from copy import deepcopy
from pathlib import Path
from typing import Any

import yaml
from fastapi.testclient import TestClient

from lunar_comm_sim.api.main import app


STEP_ENDPOINTS = [
    "build-topology",
    "calculate-routes",
    "run-nominal",
    "inject-faults",
    "analyze-fault-impact",
    "execute-healing",
    "recalculate-routes",
    "run-after-healing",
    "verify-indicators",
]


def default_raw() -> dict[str, Any]:
    with Path("configs/default_scenario.yaml").open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def create_session(client: TestClient, raw: dict[str, Any] | None = None) -> str:
    response = client.post("/api/v1/sessions", json={"scenario": raw or default_raw()})
    assert response.status_code == 200, response.text
    return response.json()["session_id"]


def run_api_steps(client: TestClient, session_id: str, steps: list[str] | None = None) -> dict[str, dict[str, Any]]:
    results = {}
    for step in steps or STEP_ENDPOINTS:
        response = client.post(f"/api/v1/sessions/{session_id}/steps/{step}")
        assert response.status_code == 200, response.text
        results[step] = response.json()
    return results


def client() -> TestClient:
    return TestClient(app)


def without_reroute(raw: dict[str, Any]) -> dict[str, Any]:
    copied = deepcopy(raw)
    copied["healing"]["enabled"] = [item for item in copied["healing"]["enabled"] if item != "reroute_backup_path"]
    return copied
