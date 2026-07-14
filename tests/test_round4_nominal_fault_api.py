from __future__ import annotations

from copy import deepcopy

from api_round1_helpers import client, create_session, default_raw, run_api_steps
from lunar_comm_sim.api.schemas import FaultPayload
from lunar_comm_sim.core.scenario import load_scenario_from_dict


def test_fault_payload_enabled_defaults_to_true_for_backward_compatibility() -> None:
    payload = FaultPayload.model_validate(
        {
            "id": "F1",
            "type": "main_hub_failure",
            "target": "lander_main_hub",
            "start_s": 10,
            "duration_s": 20,
            "severity": 0.8,
        }
    )
    assert payload.enabled is True
    scenario = load_scenario_from_dict(default_raw())
    assert len(scenario.faults) == 4
    assert all(fault.enabled for fault in scenario.faults)


def test_disabled_fault_event_is_not_applied_even_when_type_is_enabled() -> None:
    raw = default_raw()
    raw["faults"]["enabled"] = ["radiation_cpu_lock"]
    raw["faults"]["schedule"] = [
        {
            "id": "enabled_cpu_lock",
            "type": "radiation_cpu_lock",
            "target": "lander_main_hub",
            "start_s": 5,
            "duration_s": 10,
            "severity": 0.25,
            "enabled": True,
        },
        {
            "id": "disabled_cpu_lock",
            "type": "radiation_cpu_lock",
            "target": "lander_main_hub",
            "start_s": 6,
            "duration_s": 10,
            "severity": 1.0,
            "enabled": False,
        },
    ]
    test_client = client()
    session_id = create_session(test_client, raw)
    results = run_api_steps(test_client, session_id, ["build-topology", "calculate-routes", "run-nominal", "inject-faults"])
    records = results["inject-faults"]["step_result"]["fault_records"]
    assert [record["fault_id"] for record in records] == ["enabled_cpu_lock"]


def test_default_scenario_first_five_steps_have_round4_fault_outputs() -> None:
    test_client = client()
    session_id = create_session(test_client)
    results = run_api_steps(
        test_client,
        session_id,
        ["build-topology", "calculate-routes", "run-nominal", "inject-faults", "analyze-fault-impact"],
    )

    step3 = results["run-nominal"]["step_result"]
    assert len(step3["services"]) == 4
    assert step3["metrics"]
    assert step3["physical_model_validation"]
    for key in [
        "rf_lifetime_prediction_error_pct",
        "dust_gain_loss_quantification_error_pct",
        "predicted_rf_lifetime_h",
        "reference_rf_lifetime_h",
        "predicted_gain_loss_db",
        "reference_gain_loss_db",
    ]:
        assert key in step3["physical_model_metrics"]

    step4 = results["inject-faults"]["step_result"]
    assert len(step4["fault_records"]) == 4
    assert all(route["route_source"] == "inherited_nominal" for route in step4["routes"].values())
    assert all(not route["valid"] for route in step4["routes"].values())
    assert all("relay_backup_1" not in route["path"] and "relay_backup_2" not in route["path"] for route in step4["routes"].values())

    step5 = results["analyze-fault-impact"]["step_result"]
    assert len(step5["services"]) == 4
    fault_impact = step5["fault_impact"]
    assert fault_impact["metric_deltas"]
    assert fault_impact["propagation_predictions"]
    assert fault_impact["observed_impacts"]
    assert fault_impact["propagation_comparison"]
    for key in [
        "cascading_fault_prediction_accuracy",
        "fault_propagation_delay_error_pct",
        "propagation_true_positive_count",
        "propagation_false_positive_count",
        "propagation_false_negative_count",
    ]:
        assert key in fault_impact["propagation_metrics"]


def test_service_simulation_nonfinite_delay_uses_strict_json_wrapper() -> None:
    raw = deepcopy(default_raw())
    raw["nodes"].append({"id": "isolated_node", "type": "terminal", "role": "isolated"})
    raw["services"] = [
        {
            "id": "isolated_service",
            "source": raw["nodes"][0]["id"],
            "target": "isolated_node",
            "priority": 1,
            "required_bandwidth_mbps": 1,
        }
    ]
    test_client = client()
    session_id = create_session(test_client, raw)
    results = run_api_steps(test_client, session_id, ["build-topology", "calculate-routes", "run-nominal"])
    service = results["run-nominal"]["step_result"]["services"][0]
    assert service["reachable"] is False
    assert service["end_to_end_delay_ms"] == {"value": None, "value_status": "positive_infinity"}


def test_catalog_fault_modes_include_round4_metadata() -> None:
    response = client().get("/api/v1/catalogs")
    assert response.status_code == 200
    faults = {item["id"]: item for item in response.json()["fault_modes"]}
    assert faults["main_hub_failure"]["implementation_status"] == "implemented"
    assert faults["main_hub_failure"]["target_scope"] == "node"
    assert faults["route_oscillation"]["implementation_status"] == "registered_only"
    assert "尚未实现专属退化作用" in faults["route_oscillation"]["description_zh"]
