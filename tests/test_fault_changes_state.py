from lunar_comm_sim.core.faults import apply_faults
from lunar_comm_sim.core.scenario import load_scenario
from lunar_comm_sim.core.topology import build_topology


def test_faults_change_graph_state():
    scenario = load_scenario("configs/default_scenario.yaml")
    graph = build_topology(scenario)
    sample_edge = ("relay_backup_1", "lunar_orbiter")
    before_snr = graph.edges[sample_edge]["snr_db"]
    before_congestion = graph.edges[sample_edge].get("congestion_multiplier", 1.0)

    faulted, _ = apply_faults(graph, scenario)

    assert faulted.nodes["lander_main_hub"]["active"] is False
    assert all(not data["active"] for _, _, data in faulted.edges("lander_main_hub", data=True))
    assert faulted.edges[sample_edge]["snr_db"] < before_snr
    assert faulted.edges[sample_edge]["congestion_multiplier"] > before_congestion
