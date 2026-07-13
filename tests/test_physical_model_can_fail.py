import yaml

from lunar_comm_sim.sim.engine import run_simulation


def test_physical_model_bias_can_make_indicator_fail(tmp_path):
    raw = yaml.safe_load(open("configs/default_scenario.yaml", encoding="utf-8"))
    raw["physical_model_config"]["dust_gain"]["model_bias"] = 0.50

    result = run_simulation(raw, tmp_path)
    indicator = next(row for row in result["indicators"] if row["id"] == "dust_gain_loss_error")

    assert indicator["status"] == "failed"
    assert float(indicator["actual"]) > float(indicator["threshold"])
