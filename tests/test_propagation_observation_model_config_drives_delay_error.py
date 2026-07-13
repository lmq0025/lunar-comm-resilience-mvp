import yaml

from lunar_comm_sim.sim.engine import run_simulation


def test_observation_model_changes_propagation_delay_error(tmp_path):
    baseline = run_simulation("configs/default_scenario.yaml", tmp_path / "baseline")
    raw = yaml.safe_load(open("configs/default_scenario.yaml", encoding="utf-8"))
    raw["fault_propagation"]["observation_model"]["qos_detection_delay_ms"] = 300
    raw["fault_propagation"]["observation_model"]["service_detection_delay_ms"] = 250

    changed = run_simulation(raw, tmp_path / "changed")

    assert changed["propagation_metrics"]["fault_propagation_delay_error_pct"] != baseline["propagation_metrics"]["fault_propagation_delay_error_pct"]
