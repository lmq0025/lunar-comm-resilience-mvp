from copy import deepcopy

from api_round1_helpers import client, default_raw


def test_default_scenario_validation_summary() -> None:
    response = client().post("/api/v1/scenarios/validate", json=default_raw())
    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is True
    assert body["summary"] == {
        "node_count": 12,
        "link_count": 20,
        "service_count": 4,
        "fault_count": 4,
        "indicator_count": 14,
    }
    assert any("all_rf_links" in warning["message"] for warning in body["warnings"])


def test_scenario_validation_rejects_unknown_link_endpoint() -> None:
    raw = deepcopy(default_raw())
    raw["links"][0]["source"] = "missing_node"
    response = client().post("/api/v1/scenarios/validate", json=raw)
    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is False
    assert any(error["field"] == "links.0.source" for error in body["errors"])
