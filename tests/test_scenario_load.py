from lunar_comm_sim.core.scenario import load_scenario


def test_default_scenario_loads_expected_content():
    scenario = load_scenario("configs/default_scenario.yaml")

    assert scenario.name == "default_lunar_comm_resilience_mvp"
    assert len(scenario.nodes) == 12
    assert len(scenario.services) >= 4
    assert "main_hub_failure" in scenario.faults_enabled
    assert "reroute_backup_path" in scenario.healing_enabled
