from copy import deepcopy

import yaml

from lunar_comm_sim.sim.engine import run_simulation


def _accuracy(result):
    return float(
        next(
            row["value"]
            for row in result["metrics"]
            if row["phase"] == "after_healing" and row["metric"] == "cascading_fault_prediction_accuracy"
        )
    )


def test_wrong_propagation_graph_reduces_prediction_accuracy(tmp_path):
    raw = yaml.safe_load(open("configs/default_scenario.yaml", encoding="utf-8"))
    wrong = deepcopy(raw)
    wrong["fault_propagation"]["edges"] = [
        edge
        for edge in wrong["fault_propagation"]["edges"]
        if not (edge["source"] == "main_hub_failure" and edge["target"] == "route_invalid")
    ]

    baseline = run_simulation(raw, tmp_path / "baseline")
    degraded = run_simulation(wrong, tmp_path / "wrong")

    assert _accuracy(degraded) < _accuracy(baseline)
