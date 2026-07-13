from pathlib import Path

import yaml

from lunar_comm_sim.sim.engine import run_simulation


def _write_scenario(tmp_path: Path, data: dict, name: str) -> Path:
    path = tmp_path / name
    path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
    return path


def _load_default() -> dict:
    return yaml.safe_load(Path("configs/default_scenario.yaml").read_text(encoding="utf-8"))


def _metric(result: dict, phase: str, metric: str) -> float:
    row = next(item for item in result["metrics"] if item["phase"] == phase and item["metric"] == metric)
    return float(row["value"])


def test_dust_level_changes_rf_metrics(tmp_path: Path):
    low = _load_default()
    high = _load_default()
    low["environment"]["dust_level"] = 0.05
    high["environment"]["dust_level"] = 0.85

    low_result = run_simulation(_write_scenario(tmp_path, low, "low_dust.yaml"), tmp_path / "low")
    high_result = run_simulation(_write_scenario(tmp_path, high, "high_dust.yaml"), tmp_path / "high")

    assert _metric(high_result, "nominal", "antenna_gain_db") < _metric(low_result, "nominal", "antenna_gain_db")
    assert _metric(high_result, "nominal", "packet_loss_rate") > _metric(low_result, "nominal", "packet_loss_rate")


def test_relay_handover_config_changes_before_healing_metric(tmp_path: Path):
    short = _load_default()
    long = _load_default()
    short["environment"]["relay_handover"]["handover_extra_delay_ms"] = 40
    long["environment"]["relay_handover"]["handover_extra_delay_ms"] = 180

    short_result = run_simulation(_write_scenario(tmp_path, short, "short_handover.yaml"), tmp_path / "short")
    long_result = run_simulation(_write_scenario(tmp_path, long, "long_handover.yaml"), tmp_path / "long")

    assert _metric(long_result, "before_healing", "relay_handover_delay_disturbance_ms") > _metric(short_result, "before_healing", "relay_handover_delay_disturbance_ms")
