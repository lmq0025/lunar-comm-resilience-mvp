from lunar_comm_sim.core.scenario import load_scenario


def test_default_scenario_loads_fault_propagation_config():
    scenario = load_scenario("configs/default_scenario.yaml")

    assert scenario.fault_propagation["enabled"] is True
    assert scenario.fault_propagation["nodes"]
    assert scenario.fault_propagation["edges"]
