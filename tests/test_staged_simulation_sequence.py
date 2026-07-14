from api_round1_helpers import client, create_session, run_api_steps
from lunar_comm_sim.sim.engine import REQUIRED_OUTPUTS


def test_default_scenario_runs_complete_nine_step_sequence() -> None:
    test_client = client()
    session_id = create_session(test_client)
    results = run_api_steps(test_client, session_id)

    step1 = results["build-topology"]["step_result"]["topology"]["summary"]
    assert step1["node_count"] == 12
    assert step1["edge_count"] == 20

    step2_routes = results["calculate-routes"]["step_result"]["routes"]
    assert len(step2_routes) == 4
    assert all(route["valid"] for route in step2_routes.values())

    step3_services = results["run-nominal"]["step_result"]["services"]
    assert len(step3_services) == 4
    assert {service["phase"] for service in step3_services} == {"nominal"}

    step4 = results["inject-faults"]["step_result"]
    assert len(step4["fault_records"]) == 4
    assert all(route["route_source"] == "inherited_nominal" for route in step4["routes"].values())
    assert all(not route["valid"] for route in step4["routes"].values())
    assert all("lander_main_hub" in route["path"] for route in step4["routes"].values())
    assert all("relay_backup_1" not in route["path"] and "relay_backup_2" not in route["path"] for route in step4["routes"].values())

    step5 = results["analyze-fault-impact"]["step_result"]
    assert len(step5["services"]) == 4
    fault_impact = step5["fault_impact"]
    assert set(fault_impact["invalid_service_ids"]) == set(step2_routes)
    assert fault_impact["propagation_predictions"]
    assert fault_impact["observed_impacts"]
    assert fault_impact["propagation_metrics"]

    step6 = results["execute-healing"]["step_result"]
    assert step6["pending_route_recalculation"] is True
    assert {action["strategy"] for action in step6["healing_actions"]} == {
        "priority_scheduling",
        "service_degradation",
        "store_and_forward",
        "relay_pre_handover",
    }
    assert all(route["route_source"] == "inherited_nominal" for route in step6["routes"].values())
    assert all(not route["valid"] for route in step6["routes"].values())

    step7_routes = results["recalculate-routes"]["step_result"]["routes"]
    assert all(route["valid"] for route in step7_routes.values())
    assert all(route["route_source"] == "reroute_backup_path" for route in step7_routes.values())
    assert any("relay_backup_1" in route["path"] for route in step7_routes.values())
    assert any("relay_backup_2" in route["path"] for route in step7_routes.values())

    step8 = results["run-after-healing"]["step_result"]
    assert len(step8["services"]) == 4
    assert {service["phase"] for service in step8["services"]} == {"after_healing"}

    step9 = results["verify-indicators"]["step_result"]
    assert step9["applicable_count"] == 14
    assert step9["passed_count"] == 14
    artifacts = {artifact["filename"]: artifact for artifact in step9["artifacts"]}
    assert set(REQUIRED_OUTPUTS) == set(artifacts)
    assert all(artifacts[name]["exists"] and artifacts[name]["size_bytes"] > 0 for name in REQUIRED_OUTPUTS)
