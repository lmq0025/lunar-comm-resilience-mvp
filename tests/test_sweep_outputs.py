from lunar_comm_sim.experiments.sweep import run_sweep


def test_dust_sweep_outputs_monotonic_rf_trend(tmp_path):
    result = run_sweep(
        "configs/default_scenario.yaml",
        "configs/experiments/dust_sweep.yaml",
        tmp_path / "dust",
    )
    rows = sorted(result["rows"], key=lambda row: float(row["dust_level"]))
    assert (tmp_path / "dust" / "runs.csv").exists()
    assert float(rows[-1]["antenna_gain_db"]) < float(rows[0]["antenna_gain_db"])
    assert float(rows[-1]["packet_loss_rate"]) > float(rows[0]["packet_loss_rate"])


def test_relay_handover_sweep_disturbance_follows_config_without_pre_handover(tmp_path):
    result = run_sweep(
        "configs/default_scenario.yaml",
        "configs/experiments/relay_handover_sweep.yaml",
        tmp_path / "handover",
    )
    rows = sorted(result["rows"], key=lambda row: float(row["relay_handover_extra_delay_ms"]))
    assert (tmp_path / "handover" / "runs.csv").exists()
    assert float(rows[-1]["relay_handover_delay_disturbance_ms"]) > float(rows[0]["relay_handover_delay_disturbance_ms"])
