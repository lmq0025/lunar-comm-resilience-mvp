from lunar_comm_sim.experiments.sweep import run_sweep


def test_dust_sweep_isolated_shows_physical_layer_trends(tmp_path):
    result = run_sweep(
        "configs/default_scenario.yaml",
        "configs/experiments/dust_sweep_isolated.yaml",
        tmp_path,
    )
    rows = sorted(result["rows"], key=lambda row: float(row["dust_level"]))

    assert float(rows[-1]["antenna_gain_db"]) < float(rows[0]["antenna_gain_db"])
    assert float(rows[-1]["snr_db"]) < float(rows[0]["snr_db"])
    assert float(rows[-1]["packet_loss_rate"]) > float(rows[0]["packet_loss_rate"])
