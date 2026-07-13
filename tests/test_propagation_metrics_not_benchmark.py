from lunar_comm_sim.sim.engine import run_simulation


def _metric(result, metric):
    return next(row["value"] for row in result["metrics"] if row["phase"] == "after_healing" and row["metric"] == metric)


def test_propagation_metrics_come_from_comparison_not_reference_values(tmp_path):
    result = run_simulation("configs/default_scenario.yaml", tmp_path)
    scenario = result["scenario"]

    assert _metric(result, "cascading_fault_prediction_accuracy") != scenario.model_parameters["reference_cascading_fault_prediction_accuracy"]
    assert _metric(result, "fault_propagation_delay_error_pct") != scenario.model_parameters["reference_fault_propagation_delay_error_pct"]
    assert result["propagation_comparison"]
