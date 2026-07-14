import math

from lunar_comm_sim.sim.engine import run_simulation
from lunar_comm_sim.sim.staged_engine import (
    analyze_fault_impact_step,
    build_topology_step,
    calculate_routes_step,
    create_staged_state,
    execute_healing_step,
    inject_faults_step,
    recalculate_routes_step,
    run_after_healing_step,
    run_nominal_step,
    simulation_result,
    verify_indicators_step,
)


def test_staged_run_matches_full_run_for_routes_indicators_and_metrics(tmp_path) -> None:
    full = run_simulation("configs/default_scenario.yaml", tmp_path / "full", write_artifacts=False)

    state = create_staged_state("configs/default_scenario.yaml", output_dir=tmp_path / "staged")
    for step in [
        build_topology_step,
        calculate_routes_step,
        run_nominal_step,
        inject_faults_step,
        analyze_fault_impact_step,
        execute_healing_step,
        recalculate_routes_step,
        run_after_healing_step,
    ]:
        step(state)
    verify_indicators_step(state, write_artifacts=False)
    staged = simulation_result(state)

    assert _route_paths(full["routes"]["nominal"]) == _route_paths(staged["routes"]["nominal"])
    assert _route_paths(full["routes"]["before_healing"]) == _route_paths(staged["routes"]["before_healing"])
    assert _route_paths(full["routes"]["after_healing"]) == _route_paths(staged["routes"]["after_healing"])
    assert len(full["faults"]) == len(staged["faults"]) == 4
    assert len(full["healing_actions"]) == len(staged["healing_actions"]) == 5

    full_indicators = {row["id"]: row for row in full["indicators"]}
    staged_indicators = {row["id"]: row for row in staged["indicators"]}
    for indicator_id, full_row in full_indicators.items():
        staged_row = staged_indicators[indicator_id]
        assert full_row["applicable"] == staged_row["applicable"]
        assert full_row["status"] == staged_row["status"]
        assert full_row["passed"] == staged_row["passed"]

    for metric in [
        "subnet_paralysis_probability",
        "route_convergence_time_ms",
        "video_return_success_rate",
        "science_data_interruption_s",
        "cascading_fault_prediction_accuracy",
    ]:
        assert math.isclose(_metric(full["metrics"], "after_healing", metric), _metric(staged["metrics"], "after_healing", metric), rel_tol=1e-9, abs_tol=1e-9)


def _route_paths(routes):
    return {service_id: (route["path"], route["valid"], route["source"]) for service_id, route in routes.items()}


def _metric(metrics, phase, metric):
    for row in metrics:
        if row["phase"] == phase and row["metric"] == metric:
            return float(row["value"])
    raise AssertionError(f"missing metric {phase}:{metric}")
