from pathlib import Path

import yaml

from lunar_comm_sim.sim.engine import run_simulation


def _scenario_without_healing(tmp_path: Path) -> Path:
    data = yaml.safe_load(Path("configs/default_scenario.yaml").read_text(encoding="utf-8"))
    data["healing"]["enabled"] = []
    path = tmp_path / "no_healing.yaml"
    path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
    return path


def _metric(result: dict, metric: str) -> float:
    row = next(item for item in result["metrics"] if item["phase"] == "after_healing" and item["metric"] == metric)
    return float(row["value"])


def test_healing_enabled_improves_key_metrics(tmp_path: Path):
    healed = run_simulation("configs/default_scenario.yaml", tmp_path / "healed")
    no_healing = run_simulation(_scenario_without_healing(tmp_path), tmp_path / "no_healing")

    assert not all(row["passed"] for row in no_healing["indicators"])
    assert _metric(healed, "route_convergence_time_ms") < _metric(no_healing, "route_convergence_time_ms")
    assert _metric(healed, "relay_handover_delay_disturbance_ms") < _metric(no_healing, "relay_handover_delay_disturbance_ms")
    assert _metric(healed, "video_return_success_rate") > _metric(no_healing, "video_return_success_rate")
    assert _metric(healed, "science_data_interruption_s") < _metric(no_healing, "science_data_interruption_s")
