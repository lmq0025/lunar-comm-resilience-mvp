from lunar_comm_sim.experiments.ablation import run_ablation


def _by_strategy(rows):
    return {row["strategy_set"]: row for row in rows}


def test_healing_ablation_shows_strategy_contribution(tmp_path):
    result = run_ablation(
        "configs/default_scenario.yaml",
        "configs/experiments/healing_ablation.yaml",
        tmp_path,
    )
    rows = _by_strategy(result["rows"])

    assert rows["no_healing"]["indicator_pass_count"] < rows["full_healing"]["indicator_pass_count"]
    assert float(rows["reroute_only"]["subnet_paralysis_probability"]) < float(rows["no_healing"]["subnet_paralysis_probability"])
    assert float(rows["full_healing"]["science_data_interruption_s"]) < float(rows["reroute_only"]["science_data_interruption_s"])
    assert float(rows["full_healing"]["video_return_success_rate"]) > float(rows["reroute_only"]["video_return_success_rate"])
