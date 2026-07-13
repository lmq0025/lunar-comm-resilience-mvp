from pathlib import Path

import pytest
import yaml

from lunar_comm_sim.sim.engine import run_simulation


def test_missing_baseline_file_fails_loudly(tmp_path):
    raw = yaml.safe_load(Path("configs/default_scenario.yaml").read_text(encoding="utf-8"))
    raw["physical_model_config"]["dust_gain"]["reference_path"] = "data/baselines/not_a_real_curve.csv"

    with pytest.raises(FileNotFoundError, match="Physical model reference file not found"):
        run_simulation(raw, tmp_path)


def test_reference_paths_resolve_from_other_cwd_with_raw_dict(tmp_path, monkeypatch):
    raw = yaml.safe_load(Path("configs/default_scenario.yaml").read_text(encoding="utf-8"))
    monkeypatch.chdir(tmp_path)

    result = run_simulation(raw, tmp_path / "out")

    assert result["physical_model_validation"]
    assert {row["model"] for row in result["physical_model_validation"]} == {"rf_lifetime", "dust_gain"}
