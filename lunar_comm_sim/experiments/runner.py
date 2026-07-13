"""Single-run wrapper used by batch experiments."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from lunar_comm_sim.experiments.scenario_mutator import apply_mutations, load_raw_scenario, write_raw_scenario
from lunar_comm_sim.sim.engine import run_simulation


STANDARD_METRICS = [
    "subnet_paralysis_probability",
    "route_convergence_time_ms",
    "relay_handover_delay_disturbance_ms",
    "control_command_loss_rate",
    "video_return_success_rate",
    "science_data_interruption_s",
    "resource_contention_resolution_rate",
    "cascading_fault_prediction_accuracy",
    "fault_propagation_delay_error_pct",
    "rf_lifetime_prediction_error_pct",
    "dust_gain_loss_quantification_error_pct",
    "predicted_gain_loss_db",
    "reference_gain_loss_db",
]


def run_once(
    base_scenario_path: str | Path,
    mutations: dict[str, Any] | None,
    output_dir: str | Path,
    run_id: int | str,
    experiment_type: str,
    write_artifacts: bool = False,
    save_run_scenarios: bool = False,
    stochastic_events: dict[str, Any] | None = None,
    raw_scenario: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Run one mutated scenario and return experiment-friendly results."""

    out_dir = Path(output_dir)
    raw = raw_scenario if raw_scenario is not None else apply_mutations(load_raw_scenario(base_scenario_path), mutations)
    scenario_input: str | Path | dict[str, Any] = raw
    run_output = out_dir
    if save_run_scenarios:
        scenario_path = write_raw_scenario(raw, out_dir / "_scenarios" / f"scenario_{run_id}.yaml")
        scenario_input = scenario_path
        run_output = out_dir / "_runs" / str(run_id)
    result = run_simulation(scenario_input, run_output, write_artifacts=write_artifacts)

    after_metrics = _metrics_by_phase(result["metrics"], "after_healing")
    row = {
        "run_id": run_id,
        "experiment_type": experiment_type,
        "mutation_parameters": json.dumps(mutations or {}, sort_keys=True),
        "indicator_pass_count": sum(
            1 for item in result["indicators"] if item.get("applicable", True) and item.get("status") == "passed"
        ),
        "indicator_total_count": len(result["indicators"]),
        "applicable_indicator_count": sum(1 for item in result["indicators"] if item.get("applicable", True)),
        "not_applicable_indicator_count": sum(1 for item in result["indicators"] if not item.get("applicable", True)),
    }
    row.update(stochastic_events or {})
    for metric in STANDARD_METRICS:
        row[metric] = after_metrics.get(metric)

    return {
        "row": row,
        "result": result,
        "metrics": result["metrics"],
        "indicator_check": result["indicators"],
        "service_results": result["services"],
        "service_routes": result["routes"],
    }


def _metrics_by_phase(metrics: list[dict[str, Any]], phase: str) -> dict[str, float]:
    values = {}
    for item in metrics:
        if item["phase"] != phase:
            continue
        try:
            values[item["metric"]] = float(item["value"])
        except (TypeError, ValueError):
            values[item["metric"]] = item["value"]
    return values
