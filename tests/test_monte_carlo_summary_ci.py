import csv
from pathlib import Path

import yaml

from lunar_comm_sim.experiments.monte_carlo import run_monte_carlo


def test_monte_carlo_summary_contains_wilson_ci(tmp_path: Path):
    data = yaml.safe_load(Path("configs/experiments/main_hub_monte_carlo.yaml").read_text(encoding="utf-8"))
    data["experiment"]["n_runs"] = 5
    path = tmp_path / "mc_ci.yaml"
    path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")

    run_monte_carlo("configs/default_scenario.yaml", path, tmp_path / "mc")
    rows = list(csv.DictReader((tmp_path / "mc" / "monte_carlo_summary.csv").open("r", encoding="utf-8")))
    row = rows[0]
    risk = float(row["estimated_subnet_paralysis_risk"])

    assert "risk_ci95_low" in row
    assert "risk_ci95_high" in row
    assert float(row["risk_ci95_low"]) <= risk <= float(row["risk_ci95_high"])
