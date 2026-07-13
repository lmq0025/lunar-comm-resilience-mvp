"""Healing-strategy ablation runner."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from lunar_comm_sim.experiments.runner import run_once
from lunar_comm_sim.experiments.summarize import plot_bar, summarize_runs, write_csv, write_experiment_report


def run_ablation(base_scenario_path: str | Path, experiment_path: str | Path, output_dir: str | Path) -> dict[str, Any]:
    config = yaml.safe_load(Path(experiment_path).read_text(encoding="utf-8"))
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    rows = []
    indicators = None
    for index, strategy_set in enumerate(config.get("strategy_sets", [])):
        mutations = {"healing_enabled": strategy_set.get("healing_enabled", [])}
        run = run_once(base_scenario_path, mutations, out_dir, index, "ablation", write_artifacts=False)
        row = dict(run["row"])
        row["strategy_set"] = strategy_set["name"]
        rows.append(row)
        indicators = run["indicator_check"]

    summary = summarize_runs(rows, indicators)
    write_csv(out_dir / "runs.csv", rows)
    write_csv(out_dir / "summary.csv", summary)
    plot_bar(rows, "strategy_set", "indicator_pass_count", out_dir / "plots" / "indicator_pass_count_bar.png", "Indicator pass count by healing strategy")
    plot_bar(rows, "strategy_set", "science_data_interruption_s", out_dir / "plots" / "science_interruption_bar.png", "Science data interruption by healing strategy")
    write_experiment_report(out_dir / "experiment_report.md", config, rows, summary)
    return {"rows": rows, "summary": summary}
