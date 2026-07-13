"""Parameter sweep runners."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from lunar_comm_sim.experiments.runner import run_once
from lunar_comm_sim.experiments.summarize import plot_line, summarize_runs, write_csv, write_experiment_report


def run_sweep(base_scenario_path: str | Path, experiment_path: str | Path, output_dir: str | Path) -> dict[str, Any]:
    config = yaml.safe_load(Path(experiment_path).read_text(encoding="utf-8"))
    parameter = config.get("parameter", {})
    parameter_name = parameter["name"]
    values = parameter.get("values", [])
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    rows = []
    indicators = None
    for index, value in enumerate(values):
        mutations = dict(config.get("mutations", {}))
        mutations[parameter_name] = value
        if "healing_enabled" in config:
            mutations["healing_enabled"] = config["healing_enabled"]
        run = run_once(base_scenario_path, mutations, out_dir, index, "sweep", write_artifacts=False)
        row = dict(run["row"])
        row["parameter_name"] = parameter_name
        row["parameter_value"] = value
        row[parameter_name] = value
        after = {item["metric"]: item["value"] for item in run["metrics"] if item["phase"] == "after_healing"}
        for metric in config.get("output_metrics", []):
            row[metric] = after.get(metric, row.get(metric))
        rows.append(row)
        indicators = run["indicator_check"]

    summary = summarize_runs(rows, indicators)
    write_csv(out_dir / "runs.csv", rows)
    write_csv(out_dir / "summary.csv", summary)
    _write_sweep_plots(config, rows, out_dir, parameter_name)
    write_experiment_report(out_dir / "experiment_report.md", config, rows, summary)
    return {"rows": rows, "summary": summary}


def _write_sweep_plots(config: dict[str, Any], rows: list[dict[str, Any]], out_dir: Path, parameter_name: str) -> None:
    name = config.get("experiment", {}).get("name", "")
    if name == "dust_sweep":
        plot_line(rows, parameter_name, "packet_loss_rate", out_dir / "plots" / "dust_vs_packet_loss.png", "Dust vs packet loss")
        plot_line(rows, parameter_name, "antenna_gain_db", out_dir / "plots" / "dust_vs_antenna_gain.png", "Dust vs antenna gain")
    elif name == "relay_handover_sweep":
        plot_line(
            rows,
            parameter_name,
            "relay_handover_delay_disturbance_ms",
            out_dir / "plots" / "handover_vs_delay_disturbance.png",
            "Handover extra delay vs disturbance",
        )
