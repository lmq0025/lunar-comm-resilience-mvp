"""Monte Carlo experiment runner."""

from __future__ import annotations

import random
from pathlib import Path
from typing import Any

import yaml

from lunar_comm_sim.experiments.scenario_mutator import apply_mutations, load_raw_scenario
from lunar_comm_sim.experiments.runner import run_once
from lunar_comm_sim.experiments.summarize import plot_hist, summarize_runs, write_csv, write_experiment_report
from lunar_comm_sim.experiments.stochastic import apply_stochastic_realization


def run_monte_carlo(base_scenario_path: str | Path, experiment_path: str | Path, output_dir: str | Path) -> dict[str, Any]:
    config = yaml.safe_load(Path(experiment_path).read_text(encoding="utf-8"))
    meta = config.get("experiment", {})
    n_runs = int(meta.get("n_runs", 1))
    rng = random.Random(int(meta.get("random_seed", 0)))
    save_run_scenarios = bool(meta.get("save_run_scenarios", config.get("save_run_scenarios", False)))
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    base_raw = load_raw_scenario(base_scenario_path)

    rows = []
    indicators = None
    for run_id in range(n_runs):
        mutations = _sample_mutations(config.get("randomized_parameters", {}), rng)
        mutated_raw = apply_mutations(base_raw, mutations)
        realized_raw, stochastic_events = apply_stochastic_realization(mutated_raw, rng, config.get("stochastic", {}))
        run = run_once(
            base_scenario_path,
            mutations,
            out_dir,
            run_id,
            "monte_carlo",
            write_artifacts=False,
            save_run_scenarios=save_run_scenarios,
            stochastic_events=stochastic_events,
            raw_scenario=realized_raw,
        )
        rows.append(run["row"])
        indicators = run["indicator_check"]

    summary = summarize_runs(rows, indicators)
    mc_summary = _monte_carlo_summary(rows, config)
    write_csv(out_dir / "runs.csv", rows)
    write_csv(out_dir / "summary.csv", summary)
    write_csv(out_dir / "monte_carlo_summary.csv", [mc_summary])
    plot_hist(rows, "subnet_paralysis_probability", out_dir / "plots" / "subnet_paralysis_hist.png", "Subnet paralysis probability")
    plot_hist(rows, "route_convergence_time_ms", out_dir / "plots" / "route_convergence_hist.png", "Route convergence time")
    write_experiment_report(
        out_dir / "experiment_report.md",
        config,
        rows,
        summary,
        extra_lines=[
            f"Estimated subnet paralysis risk: {mc_summary['estimated_subnet_paralysis_risk']:.6g}",
            f"95% Wilson CI: [{mc_summary['risk_ci95_low']:.6g}, {mc_summary['risk_ci95_high']:.6g}]",
            f"Risk target: <= {mc_summary['risk_target']:.6g}; passed: {mc_summary['risk_passed']}",
            f"Stochastic link failure sampling enabled: {mc_summary['stochastic_enabled']}",
            "If observed risk is 0, it means no failure was observed in this sample, not that the true risk is absolutely zero.",
            "Risk is the share of runs where after-healing subnet_paralysis_probability > 0.01.",
        ],
    )
    return {"rows": rows, "summary": summary, "monte_carlo_summary": mc_summary}


def _sample_mutations(parameters: dict[str, Any], rng: random.Random) -> dict[str, Any]:
    mutations: dict[str, Any] = {}
    for name, spec in parameters.items():
        if spec.get("distribution") == "uniform":
            value = rng.uniform(float(spec["min"]), float(spec["max"]))
        else:
            value = spec.get("value")
        mutations[name] = value
    return mutations


def _monte_carlo_summary(rows: list[dict[str, Any]], config: dict[str, Any]) -> dict[str, Any]:
    n_runs = len(rows)
    failed = [row for row in rows if float(row["subnet_paralysis_probability"]) > 0.01]
    risk = len(failed) / n_runs if n_runs else 0.0
    ci_low, ci_high = _wilson_interval(len(failed), n_runs)
    failed_link_counts = [float(row.get("stochastic_failed_link_count", 0) or 0) for row in rows]
    risk_target = float(config.get("risk_target", 0.01))
    return {
        "n_runs": n_runs,
        "failed_runs": len(failed),
        "estimated_subnet_paralysis_risk": risk,
        "risk_target": risk_target,
        "risk_passed": risk <= risk_target,
        "risk_ci95_low": ci_low,
        "risk_ci95_high": ci_high,
        "route_convergence_pass_rate": _pass_rate(rows, "route_convergence_time_ms", "<=", 50.0),
        "science_data_interruption_pass_rate": _pass_rate(rows, "science_data_interruption_s", "<=", 1.0),
        "video_success_pass_rate": _pass_rate(rows, "video_return_success_rate", ">=", 0.999),
        "control_command_loss_pass_rate": _pass_rate(rows, "control_command_loss_rate", "<=", 0.00001),
        "average_failed_link_count": sum(failed_link_counts) / n_runs if n_runs else 0.0,
        "max_failed_link_count": max(failed_link_counts) if failed_link_counts else 0.0,
        "stochastic_enabled": bool(config.get("stochastic", {}).get("enabled", False)),
    }


def _pass_rate(rows: list[dict[str, Any]], metric: str, operator: str, threshold: float) -> float:
    if not rows:
        return 0.0
    passed = 0
    for row in rows:
        value = float(row[metric])
        if not value == value or value in {float("inf"), float("-inf")}:
            continue
        if (value <= threshold) if operator == "<=" else (value >= threshold):
            passed += 1
    return passed / len(rows)


def _wilson_interval(failed_runs: int, n_runs: int, z: float = 1.96) -> tuple[float, float]:
    if n_runs == 0:
        return 0.0, 0.0
    p_hat = failed_runs / n_runs
    denominator = 1.0 + z * z / n_runs
    center = (p_hat + z * z / (2.0 * n_runs)) / denominator
    margin = z * ((p_hat * (1.0 - p_hat) / n_runs + z * z / (4.0 * n_runs * n_runs)) ** 0.5) / denominator
    return max(0.0, center - margin), min(1.0, center + margin)
