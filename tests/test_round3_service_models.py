from __future__ import annotations

from copy import deepcopy

from fastapi.testclient import TestClient
from pydantic import ValidationError

from lunar_comm_sim.api.main import app
from lunar_comm_sim.api.schemas import ServicePayload
from lunar_comm_sim.api.step_service import validate_scenario_payload
from lunar_comm_sim.core.scenario import load_scenario, load_scenario_from_dict


def _default_raw() -> dict:
    scenario = load_scenario("configs/default_scenario.yaml")
    return deepcopy(scenario.raw)


def test_service_payload_loads_complete_qos_fields() -> None:
    payload = ServicePayload.model_validate(
        {
            "id": "svc",
            "name": "Control",
            "service_type": "control_command",
            "source": "a",
            "target": "b",
            "priority": 1,
            "required_bandwidth_mbps": 4,
            "max_delay_ms": 160,
            "max_loss_rate": 0.01,
            "max_interruption_s": 1,
            "min_success_rate": 0.999,
            "degraded_bandwidth_mbps": 2,
        }
    )
    assert payload.name == "Control"
    assert payload.service_type == "control_command"
    assert payload.degraded_bandwidth_mbps == 2


def test_default_service_fields_remain_backward_compatible() -> None:
    scenario = load_scenario("configs/default_scenario.yaml")
    assert len(scenario.services) == 4
    assert scenario.services[0].name is None
    assert scenario.services[0].service_type is None


def test_invalid_service_payloads_are_rejected() -> None:
    base = {
        "id": "svc",
        "source": "a",
        "target": "b",
        "priority": 1,
        "required_bandwidth_mbps": 4,
    }
    invalid_cases = [
        {**base, "source": "a", "target": "a"},
        {**base, "max_loss_rate": 2},
        {**base, "min_success_rate": -0.1},
        {**base, "max_delay_ms": -1},
        {**base, "degraded_bandwidth_mbps": 8},
    ]
    for payload in invalid_cases:
        try:
            ServicePayload.model_validate(payload)
        except ValidationError:
            pass
        else:
            raise AssertionError(f"payload should be invalid: {payload}")


def test_service_semantic_validation_reports_service_fields() -> None:
    raw = _default_raw()
    raw["services"][1]["id"] = raw["services"][0]["id"]
    raw["services"][2]["target"] = raw["services"][2]["source"]
    raw["services"][3]["source"] = "missing_node"
    result = validate_scenario_payload(raw)
    fields = {error["field"] for error in result["errors"]}
    assert "services.1.id" in fields
    assert "services.3.source" in fields
    assert any(field.startswith("services.2") for field in fields)


def test_load_scenario_rejects_duplicate_service_id() -> None:
    raw = _default_raw()
    raw["services"][1]["id"] = raw["services"][0]["id"]
    try:
        load_scenario_from_dict(raw)
    except ValueError as exc:
        assert "duplicate id" in str(exc)
    else:
        raise AssertionError("duplicate service id should be rejected")


def test_round3_openapi_contains_service_and_route_models() -> None:
    schema = TestClient(app).get("/openapi.json").json()
    service_schema = schema["components"]["schemas"]["ServicePayload"]["properties"]
    for field in [
        "name",
        "service_type",
        "max_delay_ms",
        "max_loss_rate",
        "max_interruption_s",
        "min_success_rate",
        "degraded_bandwidth_mbps",
    ]:
        assert field in service_schema

    paths = schema["paths"]
    assert (
        paths["/api/v1/sessions/{session_id}/steps/build-topology"]["post"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"]
        == "#/components/schemas/BuildTopologyStepResponse"
    )
    assert (
        paths["/api/v1/sessions/{session_id}/steps/calculate-routes"]["post"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"]
        == "#/components/schemas/CalculateRoutesStepResponse"
    )
    assert "RouteSnapshotItemResponse" in schema["components"]["schemas"]


def test_default_scenario_first_two_steps_have_four_valid_routes() -> None:
    client = TestClient(app)
    raw = _default_raw()
    assert len(raw["nodes"]) == 12
    assert len(raw["links"]) == 20
    assert len(raw["services"]) == 4
    session_id = client.post("/api/v1/sessions", json={"scenario": raw}).json()["session_id"]
    step1 = client.post(f"/api/v1/sessions/{session_id}/steps/build-topology")
    assert step1.status_code == 200
    step2 = client.post(f"/api/v1/sessions/{session_id}/steps/calculate-routes")
    assert step2.status_code == 200
    routes = step2.json()["step_result"]["routes"]
    assert len(routes) == 4
    assert sum(1 for route in routes.values() if route["valid"]) == 4


def test_isolated_service_returns_no_active_path() -> None:
    client = TestClient(app)
    raw = _default_raw()
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
    session_id = client.post("/api/v1/sessions", json={"scenario": raw}).json()["session_id"]
    assert client.post(f"/api/v1/sessions/{session_id}/steps/build-topology").status_code == 200
    response = client.post(f"/api/v1/sessions/{session_id}/steps/calculate-routes")
    assert response.status_code == 200
    route = response.json()["step_result"]["routes"]["isolated_service"]
    assert route["valid"] is False
    assert route["path"] == []
    assert route["notes"] == "missing route"
