from lunar_comm_sim.sim.engine import run_simulation


def test_demo_generates_fault_propagation_outputs(tmp_path):
    run_simulation("configs/default_scenario.yaml", tmp_path)

    for name in [
        "fault_propagation_predictions.csv",
        "observed_impacts.csv",
        "fault_propagation_comparison.csv",
        "fault_propagation_metrics.csv",
    ]:
        path = tmp_path / name
        assert path.exists()
        assert path.stat().st_size > 0
