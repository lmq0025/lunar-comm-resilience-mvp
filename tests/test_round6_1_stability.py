from __future__ import annotations

import socket
from pathlib import Path

from api_round1_helpers import client, create_session
from lunar_comm_sim.app_data import runs_dir
from lunar_comm_sim.persistence.database import session_scope
from lunar_comm_sim.persistence.models import SimulationRun
from scripts.find_free_port import find_free_port


ROOT = Path(__file__).resolve().parents[1]


def test_diagnostics_is_structured_and_contains_no_secrets() -> None:
    response = client().get("/api/v1/diagnostics")
    assert response.status_code == 200
    payload = response.json()
    assert set(payload) == {
        "application_version",
        "database_status",
        "database_path",
        "app_data_dir",
        "runs_dir",
        "frontend_dist_exists",
        "auth_mode",
        "job_manager_status",
        "current_time",
    }
    assert payload["database_status"] == "ok"
    assert "password" not in response.text.lower()
    assert "token" not in response.text.lower()


def test_fastapi_single_port_routes_api_before_spa() -> None:
    test_client = client()
    assert test_client.get("/").status_code == 200
    assert test_client.get("/api/v1/health").headers["content-type"].startswith("application/json")
    assert test_client.get("/api/v1/projects").status_code == 200
    assert test_client.get("/docs").status_code == 200
    assert test_client.get("/openapi.json").status_code == 200
    missing = test_client.get("/api/v1/not-found")
    assert missing.status_code == 404
    assert missing.headers["content-type"].startswith("application/json")
    assert test_client.get("/topology").headers["content-type"].startswith("text/html")
    assert test_client.get("/simulation").headers["content-type"].startswith("text/html")


def test_api_run_output_uses_run_id_under_app_data() -> None:
    test_client = client()
    session_id = create_session(test_client)
    with session_scope() as database:
        run = database.query(SimulationRun).filter_by(session_id=session_id).one()
        assert Path(run.output_dir).resolve() == (runs_dir() / run.id).resolve()


def test_find_free_port_uses_socket_bind() -> None:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as occupied:
        occupied.bind(("127.0.0.1", 0))
        port = occupied.getsockname()[1]
        assert find_free_port(port) != port


def test_run_local_app_waits_for_health_before_opening_browser() -> None:
    launcher = (ROOT / "scripts" / "serve_local_app.py").read_text(encoding="utf-8")
    assert launcher.index("wait_for_health(health_url") < launcher.index("webbrowser.open(url)")
    batch = (ROOT / "scripts" / "run_local_app.bat").read_text(encoding="utf-8")
    assert "serve_local_app.py" in batch
    assert "find_free_port.py" in batch


def test_run_local_app_port_probe_has_no_inline_cmd_sensitive_python() -> None:
    batch = (ROOT / "scripts" / "run_local_app.bat").read_text(encoding="utf-8").lower()
    assert "python -c" not in batch
    assert "connect_ex" not in batch
    assert "!=" not in batch
