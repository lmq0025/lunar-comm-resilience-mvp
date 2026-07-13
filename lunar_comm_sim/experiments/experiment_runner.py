"""Dispatcher for configured batch experiments."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from lunar_comm_sim.experiments.ablation import run_ablation
from lunar_comm_sim.experiments.monte_carlo import run_monte_carlo
from lunar_comm_sim.experiments.sweep import run_sweep


def run_experiment(base_scenario_path: str | Path, experiment_path: str | Path, output_dir: str | Path) -> dict[str, Any]:
    config = yaml.safe_load(Path(experiment_path).read_text(encoding="utf-8"))
    experiment_type = config.get("experiment", {}).get("type")
    if experiment_type == "monte_carlo":
        return run_monte_carlo(base_scenario_path, experiment_path, output_dir)
    if experiment_type == "sweep":
        return run_sweep(base_scenario_path, experiment_path, output_dir)
    if experiment_type == "ablation":
        return run_ablation(base_scenario_path, experiment_path, output_dir)
    raise ValueError(f"Unsupported experiment type: {experiment_type}")
