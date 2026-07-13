from lunar_comm_sim.sim.engine import run_simulation


def test_before_healing_inherits_nominal_route_until_reroute_strategy(tmp_path):
    result = run_simulation("configs/default_scenario.yaml", tmp_path)

    routes = result["routes"]
    nominal_control = routes["nominal"]["control_command"]
    before_control = routes["before_healing"]["control_command"]
    after_control = routes["after_healing"]["control_command"]

    assert "lander_main_hub" in nominal_control["path"]
    assert before_control["path"] == nominal_control["path"]
    assert before_control["valid"] is False
    assert "relay_backup_1" not in before_control["path"]
    assert after_control["valid"] is True
    assert "relay_backup_1" in after_control["path"]

    before_result = next(
        item for item in result["services"] if item.phase == "before_healing" and item.service_id == "control_command"
    )
    assert before_result.route_valid is False
    assert before_result.reachable is False
