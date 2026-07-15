from __future__ import annotations

import time

from sqlalchemy import inspect

from api_round1_helpers import client, create_session, default_raw, run_api_steps
from lunar_comm_sim.api import main as api_main
from lunar_comm_sim.persistence.database import get_engine, session_scope
from lunar_comm_sim.persistence.models import SimulationRun


def test_sqlite_schema_contains_round6_tables() -> None:
    test_client = client()
    assert test_client.get("/api/v1/health").status_code == 200
    tables = set(inspect(get_engine()).get_table_names())
    assert {
        "users",
        "projects",
        "project_versions",
        "simulation_runs",
        "run_steps",
        "jobs",
        "artifacts",
        "audit_events",
    }.issubset(tables)


def test_project_crud_version_conflict_and_restore() -> None:
    test_client = client()
    raw = default_raw()
    created = test_client.post(
        "/api/v1/projects",
        json={"name": "Round 6", "description": "persistence", "scenario": raw, "editor": {"viewport": {"x": 1}}},
    )
    assert created.status_code == 200, created.text
    project = created.json()
    assert project["revision"] == 1

    updated = test_client.put(
        f"/api/v1/projects/{project['project_id']}",
        json={"expected_revision": 1, "name": "Round 6 updated"},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["revision"] == 2

    conflict = test_client.put(
        f"/api/v1/projects/{project['project_id']}",
        json={"expected_revision": 1, "description": "stale"},
    )
    assert conflict.status_code == 409

    versions = test_client.get(f"/api/v1/projects/{project['project_id']}/versions").json()["versions"]
    assert [item["revision"] for item in versions] == [2, 1]

    restored = test_client.post(f"/api/v1/projects/{project['project_id']}/restore", json={"revision": 1})
    assert restored.status_code == 200, restored.text
    assert restored.json()["name"] == "Round 6"
    assert restored.json()["revision"] == 3


def test_run_steps_are_persisted_and_restored_by_replay() -> None:
    test_client = client()
    session_id = create_session(test_client)
    run_api_steps(test_client, session_id, ["build-topology", "calculate-routes", "run-nominal"])

    latest = test_client.get("/api/v1/runs/latest").json()
    assert latest["session_id"] == session_id
    assert latest["completed_steps"] == ["topology_built", "nominal_routes_calculated", "nominal_simulated"]
    assert [step["step_name"] for step in latest["steps"]] == latest["completed_steps"]

    api_main.store.delete(session_id)
    restored = test_client.post(f"/api/v1/runs/{latest['run_id']}/restore-session")
    assert restored.status_code == 200, restored.text
    session = restored.json()["session"]
    assert session["session_id"] == session_id
    assert session["current_step"] == "nominal_simulated"

    with api_main.store.locked_session(session_id) as state:
        assert state.nominal_graph is not None
        assert state.nominal_services


def test_request_id_and_client_error_are_recorded() -> None:
    test_client = client()
    response = test_client.get("/api/v1/health", headers={"X-Request-ID": "round6-test"})
    assert response.headers["X-Request-ID"] == "round6-test"

    recorded = test_client.post(
        "/api/v1/client-errors",
        headers={"X-Request-ID": "client-error-test"},
        json={"message": "frontend smoke", "url": "http://localhost/test"},
    )
    assert recorded.status_code == 200
    assert recorded.json() == {"recorded": True, "request_id": "client-error-test"}


def test_background_step_job_persists_result() -> None:
    test_client = client()
    session_id = create_session(test_client)
    with session_scope() as session:
        run = session.query(SimulationRun).filter_by(session_id=session_id).one()
        run_id = run.id

    created = test_client.post(f"/api/v1/runs/{run_id}/jobs/topology_built")
    assert created.status_code == 200, created.text
    job_id = created.json()["job_id"]

    for _ in range(50):
        job = test_client.get(f"/api/v1/jobs/{job_id}").json()
        if job["status"] in {"completed", "failed", "cancelled", "interrupted"}:
            break
        time.sleep(0.05)

    assert job["status"] == "completed"
    latest = test_client.get("/api/v1/runs/latest").json()
    assert latest["completed_steps"] == ["topology_built"]
    assert latest["steps"][0]["response"]["completed_step"] == "topology_built"
