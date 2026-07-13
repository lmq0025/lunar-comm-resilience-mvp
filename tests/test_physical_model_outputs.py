from lunar_comm_sim.sim.engine import run_simulation


def _after_metric(result, metric):
    return next(row["value"] for row in result["metrics"] if row["phase"] == "after_healing" and row["metric"] == metric)


def test_physical_model_outputs_and_metrics_are_not_reference_benchmarks(tmp_path):
    result = run_simulation("configs/default_scenario.yaml", tmp_path)
    scenario = result["scenario"]

    assert (tmp_path / "physical_model_validation.csv").exists()
    assert (tmp_path / "physical_model_metrics.csv").exists()
    assert (tmp_path / "physical_model_validation.csv").stat().st_size > 0
    assert (tmp_path / "physical_model_metrics.csv").stat().st_size > 0
    assert result["physical_model_validation"]
    assert {row["model"] for row in result["physical_model_validation"]} == {"rf_lifetime", "dust_gain"}
    assert _after_metric(result, "rf_lifetime_prediction_error_pct") != scenario.model_parameters["reference_rf_lifetime_prediction_error_pct"]
    assert _after_metric(result, "dust_gain_loss_quantification_error_pct") != scenario.model_parameters["reference_dust_gain_error_pct"]
