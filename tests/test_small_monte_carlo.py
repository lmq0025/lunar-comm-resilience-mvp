import csv
from pathlib import Path

import yaml

from lunar_comm_sim.experiments.monte_carlo import run_monte_carlo


def _small_mc_config(tmp_path: Path) -> Path:
    data = yaml.safe_load(Path("configs/experiments/main_hub_monte_carlo.yaml").read_text(encoding="utf-8"))
    data["experiment"]["n_runs"] = 5
    data["experiment"]["random_seed"] = 99
    path = tmp_path / "small_mc.yaml"
    path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
    return path


def test_small_monte_carlo_outputs_and_reproducibility(tmp_path: Path):
    config = _small_mc_config(tmp_path)
    first = run_monte_carlo("configs/default_scenario.yaml", config, tmp_path / "first")
    second = run_monte_carlo("configs/default_scenario.yaml", config, tmp_path / "second")

    for name in ["runs.csv", "summary.csv", "experiment_report.md", "monte_carlo_summary.csv"]:
        assert (tmp_path / "first" / name).exists()

    first_rows = list(csv.DictReader((tmp_path / "first" / "runs.csv").open("r", encoding="utf-8")))
    second_rows = list(csv.DictReader((tmp_path / "second" / "runs.csv").open("r", encoding="utf-8")))
    assert len(first_rows) == 5
    assert first_rows == second_rows
    assert first["monte_carlo_summary"]["n_runs"] == 5
