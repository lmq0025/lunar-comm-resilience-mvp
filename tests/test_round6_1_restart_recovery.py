from __future__ import annotations

import os
from pathlib import Path
import subprocess
import sys

import httpx

from api_round1_helpers import default_raw
from scripts.find_free_port import find_free_port
from scripts.wait_for_health import wait_for_health


ROOT = Path(__file__).resolve().parents[1]
FIRST_FIVE = (
    "build-topology",
    "calculate-routes",
    "run-nominal",
    "inject-faults",
    "analyze-fault-impact",
)
LAST_FOUR = (
    "execute-healing",
    "recalculate-routes",
    "run-after-healing",
    "verify-indicators",
)


def test_backend_restart_restores_first_five_results_and_continues() -> None:
    port = find_free_port(9200)
    base_url = f"http://127.0.0.1:{port}"
    process = start_backend(port)
    try:
        wait_for_health(f"{base_url}/api/v1/health", timeout_s=30)
        with httpx.Client(base_url=base_url, timeout=60) as api:
            project = api.post("/api/v1/projects", json={"name": "restart recovery", "scenario": default_raw(), "editor": {}}).json()
            created = api.post(
                "/api/v1/sessions",
                json={"scenario": default_raw(), "project_id": project["project_id"], "project_revision": project["revision"]},
            )
            assert created.status_code == 200, created.text
            session_id = created.json()["session_id"]
            run_id = created.json()["run_id"]
            for endpoint in FIRST_FIVE:
                response = api.post(f"/api/v1/sessions/{session_id}/steps/{endpoint}")
                assert response.status_code == 200, response.text
    finally:
        stop_backend(process)

    process = start_backend(port)
    try:
        wait_for_health(f"{base_url}/api/v1/health", timeout_s=30)
        with httpx.Client(base_url=base_url, timeout=60) as api:
            restored = api.post(f"/api/v1/runs/{run_id}/restore-session")
            assert restored.status_code == 200, restored.text
            payload = restored.json()
            assert len(payload["run"]["steps"]) == 5
            assert payload["run"]["steps"][2]["response"]["step_result"]["services"]
            assert payload["run"]["steps"][4]["response"]["step_result"]["fault_impact"]
            for endpoint in LAST_FOUR:
                response = api.post(f"/api/v1/sessions/{session_id}/steps/{endpoint}")
                assert response.status_code == 200, response.text
            final = response.json()["step_result"]
            assert final["applicable_count"] == 14
            assert final["passed_count"] == 14
            assert len(final["artifacts"]) == 16
    finally:
        stop_backend(process)


def start_backend(port: int) -> subprocess.Popen[str]:
    return subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "lunar_comm_sim.api.main:app", "--host", "127.0.0.1", "--port", str(port)],
        cwd=ROOT,
        env=os.environ.copy(),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def stop_backend(process: subprocess.Popen[str]) -> None:
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)
