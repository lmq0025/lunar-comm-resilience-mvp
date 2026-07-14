from copy import deepcopy

import pytest
import yaml

from lunar_comm_sim.core.scenario import load_scenario, load_scenario_from_dict
from lunar_comm_sim.core.topology import build_topology


def test_default_node_fields_keep_legacy_defaults() -> None:
    scenario = load_scenario("configs/default_scenario.yaml")
    graph = build_topology(scenario)

    assert graph.nodes["lander_main_hub"]["active"] is True
    assert graph.nodes["lander_main_hub"]["availability"] == 1.0
    assert graph.nodes["lander_main_hub"]["node_processing_delay_ms"] == 0.0


def test_custom_node_fields_enter_graph() -> None:
    raw = yaml.safe_load(open("configs/default_scenario.yaml", encoding="utf-8"))
    raw = deepcopy(raw)
    raw["nodes"][0]["active"] = False
    raw["nodes"][0]["availability"] = 0.75
    raw["nodes"][0]["node_processing_delay_ms"] = 12.5

    scenario = load_scenario_from_dict(raw)
    graph = build_topology(scenario)

    data = graph.nodes[raw["nodes"][0]["id"]]
    assert data["active"] is False
    assert data["availability"] == 0.75
    assert data["node_processing_delay_ms"] == 12.5


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("availability", 1.2),
        ("availability", -0.1),
        ("node_processing_delay_ms", -1),
    ],
)
def test_invalid_node_fields_are_rejected(field: str, value: float) -> None:
    raw = yaml.safe_load(open("configs/default_scenario.yaml", encoding="utf-8"))
    raw = deepcopy(raw)
    raw["nodes"][0][field] = value

    with pytest.raises(ValueError):
        load_scenario_from_dict(raw)
