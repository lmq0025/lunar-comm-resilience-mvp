import csv
from pathlib import Path

import yaml

from lunar_comm_sim.experiments.monte_carlo import run_monte_carlo


def _mc_config(tmp_path: Path) -> Path:
    data = yaml.safe_load(Path("configs/experiments/main_hub_monte_carlo.yaml").read_text(encoding="utf-8"))
    data["experiment"]["n_runs"] = 10
    data["experiment"]["random_seed"] = 123
    path = tmp_path / "mc.yaml"
    path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
    return path


def test_monte_carlo_runs_are_reproducible(tmp_path: Path):
    config = _mc_config(tmp_path)
    run_monte_carlo("configs/default_scenario.yaml", config, tmp_path / "a")
    run_monte_carlo("configs/default_scenario.yaml", config, tmp_path / "b")

    a_rows = list(csv.DictReader((tmp_path / "a" / "runs.csv").open("r", encoding="utf-8")))
    b_rows = list(csv.DictReader((tmp_path / "b" / "runs.csv").open("r", encoding="utf-8")))

    keys = ["mutation_parameters", "stochastic_failed_link_count", "stochastic_failed_links", "subnet_paralysis_probability"]
    assert [{key: row[key] for key in keys} for row in a_rows] == [{key: row[key] for key in keys} for row in b_rows]
