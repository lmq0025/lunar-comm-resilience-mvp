from __future__ import annotations

from io import BytesIO
from zipfile import ZipFile

from api_round1_helpers import client, create_session, default_raw, run_api_steps, without_reroute
from lunar_comm_sim.sim.staged_engine import REQUIRED_OUTPUTS


def test_default_scenario_step_6_to_9_semantics_are_precise() -> None:
    test_client = client()
    session_id = create_session(test_client)
    results = run_api_steps(test_client, session_id)

    step6 = results["execute-healing"]["step_result"]
    assert [action["strategy"] for action in step6["healing_actions"]] == [
        "priority_scheduling",
        "service_degradation",
        "store_and_forward",
        "relay_pre_handover",
    ]
    assert step6["pending_route_recalculation"] is True
    assert all(route["route_source"] == "inherited_nominal" for route in step6["routes"].values())
    assert all(not route["valid"] for route in step6["routes"].values())

    step7 = results["recalculate-routes"]["step_result"]
    assert [action["strategy"] for action in step7["healing_actions"]][-1] == "reroute_backup_path"
    assert step7["pending_route_recalculation"] is False
    assert all(route["route_source"] == "reroute_backup_path" for route in step7["routes"].values())
    assert all(route["valid"] for route in step7["routes"].values())

    step8 = results["run-after-healing"]["step_result"]
    assert len(step8["services"]) == 4
    assert all(service["reachable"] for service in step8["services"])
    hd_video = next(service for service in step8["services"] if service["service_id"] == "hd_video")
    assert hd_video["degraded"] is True

    step9 = results["verify-indicators"]["step_result"]
    assert step9["applicable_count"] == 14
    assert step9["passed_count"] == 14
    assert step9["failed_count"] == 0
    assert len(step9["artifacts"]) == len(REQUIRED_OUTPUTS)


def test_reroute_disabled_uses_verified_inherited_routes() -> None:
    raw = without_reroute(default_raw())
    test_client = client()
    session_id = create_session(test_client, raw)
    results = run_api_steps(test_client, session_id, [
        "build-topology",
        "calculate-routes",
        "run-nominal",
        "inject-faults",
        "analyze-fault-impact",
        "execute-healing",
        "recalculate-routes",
    ])
    step7 = results["recalculate-routes"]["step_result"]
    assert "reroute_backup_path" not in {action["strategy"] for action in step7["healing_actions"]}
    assert step7["pending_route_recalculation"] is False
    assert all(route["route_source"] == "healing_verified_inherited" for route in step7["routes"].values())
    assert not all(route["valid"] for route in step7["routes"].values())


def test_artifact_file_and_bundle_downloads_are_restricted() -> None:
    test_client = client()
    session_id = create_session(test_client)
    run_api_steps(test_client, session_id)

    ok = test_client.get(f"/api/v1/sessions/{session_id}/artifacts/files/report.md")
    assert ok.status_code == 200
    assert b"indicator" in ok.content.lower() or ok.content

    assert test_client.get(f"/api/v1/sessions/{session_id}/artifacts/files/../report.md").status_code == 404
    assert test_client.get(f"/api/v1/sessions/{session_id}/artifacts/files/not_required.txt").status_code == 404

    bundle = test_client.get(f"/api/v1/sessions/{session_id}/artifacts/bundle")
    assert bundle.status_code == 200
    with ZipFile(BytesIO(bundle.content)) as archive:
        names = set(archive.namelist())
    assert names == set(REQUIRED_OUTPUTS)
