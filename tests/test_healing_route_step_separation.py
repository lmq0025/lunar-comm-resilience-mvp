from api_round1_helpers import client, create_session, default_raw, run_api_steps, without_reroute


def test_execute_healing_does_not_recalculate_routes_until_step_seven() -> None:
    test_client = client()
    session_id = create_session(test_client)
    results = run_api_steps(
        test_client,
        session_id,
        [
            "build-topology",
            "calculate-routes",
            "run-nominal",
            "inject-faults",
            "analyze-fault-impact",
            "execute-healing",
        ],
    )
    step6_routes = results["execute-healing"]["step_result"]["routes"]
    assert all(not route["valid"] for route in step6_routes.values())
    assert all("relay_backup_1" not in route["path"] and "relay_backup_2" not in route["path"] for route in step6_routes.values())

    step7 = test_client.post(f"/api/v1/sessions/{session_id}/steps/recalculate-routes")
    assert step7.status_code == 200
    step7_routes = step7.json()["step_result"]["routes"]
    assert all(route["valid"] for route in step7_routes.values())
    assert any("relay_backup_1" in route["path"] or "relay_backup_2" in route["path"] for route in step7_routes.values())


def test_without_reroute_strategy_step_seven_does_not_restore_all_services() -> None:
    raw = without_reroute(default_raw())
    test_client = client()
    session_id = create_session(test_client, raw)
    results = run_api_steps(test_client, session_id)
    routes = results["recalculate-routes"]["step_result"]["routes"]
    assert not all(route["valid"] for route in routes.values())
    after_metrics = results["run-after-healing"]["step_result"]["metrics"]
    subnet = next(row for row in after_metrics if row["metric"] == "subnet_paralysis_probability")
    assert subnet["value"] == 1.0
