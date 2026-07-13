from lunar_comm_sim.experiments.summarize import summarize_runs


def test_summary_counts_nonfinite_values_as_failures():
    rows = [
        {"run_id": 0, "experiment_type": "ablation", "mutation_parameters": "{}", "route_convergence_time_ms": float("inf")},
        {"run_id": 1, "experiment_type": "ablation", "mutation_parameters": "{}", "route_convergence_time_ms": 35},
        {"run_id": 2, "experiment_type": "ablation", "mutation_parameters": "{}", "route_convergence_time_ms": 35},
        {"run_id": 3, "experiment_type": "ablation", "mutation_parameters": "{}", "route_convergence_time_ms": 35},
        {"run_id": 4, "experiment_type": "ablation", "mutation_parameters": "{}", "route_convergence_time_ms": 35},
    ]
    indicators = [{"metric": "route_convergence_time_ms", "operator": "<=", "threshold": 50}]

    summary = summarize_runs(rows, indicators)
    route_summary = next(row for row in summary if row["metric"] == "route_convergence_time_ms")

    assert route_summary["pass_rate"] == 0.8
    assert route_summary["failed_count"] == 1
    assert route_summary["non_finite_count"] == 1
