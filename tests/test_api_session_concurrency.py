from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from typing import Any

from api_round1_helpers import client, create_session
from lunar_comm_sim.api import main as api_main
from lunar_comm_sim.api import step_service


def test_same_session_duplicate_step_concurrent_call_runs_once(monkeypatch) -> None:
    test_client = client()
    session_id = create_session(test_client)
    completed_step, original_handler = step_service.STEP_HANDLERS["build-topology"]
    calls = {"count": 0}

    def counted_handler(state: Any) -> dict[str, Any]:
        result = original_handler(state)
        calls["count"] += 1
        time.sleep(0.05)
        return result

    monkeypatch.setitem(step_service.STEP_HANDLERS, "build-topology", (completed_step, counted_handler))
    barrier = Barrier(2)

    def post_step() -> tuple[int, dict[str, Any]]:
        barrier.wait()
        response = test_client.post(f"/api/v1/sessions/{session_id}/steps/build-topology")
        return response.status_code, response.json()

    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(executor.map(lambda _: post_step(), range(2)))

    status_codes = sorted(status for status, _body in responses)
    assert status_codes == [200, 409]
    assert calls["count"] == 1

    summary = test_client.get(f"/api/v1/sessions/{session_id}").json()
    assert summary["completed_steps"] == ["topology_built"]
    assert summary["completed_steps"].count("topology_built") == 1
    with api_main.store.locked_session(session_id) as state:
        assert state.nominal_graph is not None
        assert state.current_step == "topology_built"


def test_different_sessions_do_not_share_graph_or_state() -> None:
    test_client = client()
    first_id = create_session(test_client)
    second_id = create_session(test_client)

    assert test_client.post(f"/api/v1/sessions/{first_id}/steps/build-topology").status_code == 200
    assert test_client.post(f"/api/v1/sessions/{second_id}/steps/build-topology").status_code == 200
    assert test_client.post(f"/api/v1/sessions/{second_id}/steps/calculate-routes").status_code == 200

    first_summary = test_client.get(f"/api/v1/sessions/{first_id}").json()
    second_summary = test_client.get(f"/api/v1/sessions/{second_id}").json()
    assert first_summary["completed_steps"] == ["topology_built"]
    assert second_summary["completed_steps"] == ["topology_built", "nominal_routes_calculated"]
    assert first_summary["output_dir"] != second_summary["output_dir"]

    with api_main.store.locked_session(first_id) as first_state:
        with api_main.store.locked_session(second_id) as second_state:
            assert first_state is not second_state
            assert first_state.nominal_graph is not second_state.nominal_graph
            assert first_state.nominal_graph is not None
            assert second_state.nominal_graph is not None
            assert "service_routes" not in first_state.nominal_graph.graph
            assert "service_routes" in second_state.nominal_graph.graph
