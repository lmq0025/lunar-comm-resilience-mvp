from pathlib import Path

import yaml

from lunar_comm_sim.sim.engine import run_simulation


def _write_without_reroute(tmp_path: Path) -> Path:
    data = yaml.safe_load(Path("configs/default_scenario.yaml").read_text(encoding="utf-8"))
    data["healing"]["enabled"] = [
        strategy for strategy in data["healing"]["enabled"] if strategy != "reroute_backup_path"
    ]
    path = tmp_path / "without_reroute.yaml"
    path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
    return path


def _metric(result: dict, metric: str) -> float:
    row = next(item for item in result["metrics"] if item["phase"] == "after_healing" and item["metric"] == metric)
    return float(row["value"])


def test_reroute_strategy_controls_route_recovery(tmp_path: Path):
    with_reroute = run_simulation("configs/default_scenario.yaml", tmp_path / "with")
    without_reroute = run_simulation(_write_without_reroute(tmp_path), tmp_path / "without")

    assert _metric(with_reroute, "route_convergence_time_ms") < float("inf")
    assert _metric(with_reroute, "subnet_paralysis_probability") == 0.0
    assert _metric(without_reroute, "subnet_paralysis_probability") == 1.0
    assert _metric(without_reroute, "science_data_interruption_s") > _metric(with_reroute, "science_data_interruption_s")
    assert all(route["valid"] for route in with_reroute["routes"]["after_healing"].values())
    assert not all(route["valid"] for route in without_reroute["routes"]["after_healing"].values())
