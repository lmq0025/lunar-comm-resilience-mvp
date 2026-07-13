from lunar_comm_sim.sim.engine import run_simulation


def test_propagation_delay_error_is_nonzero_but_within_target(tmp_path):
    result = run_simulation("configs/default_scenario.yaml", tmp_path)
    value = float(result["propagation_metrics"]["fault_propagation_delay_error_pct"])

    assert value != 0.0
    assert value <= 15.0
