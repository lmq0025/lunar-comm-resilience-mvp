import networkx as nx

from lunar_comm_sim.core.faults import apply_faults
from lunar_comm_sim.core.scenario import load_scenario
from lunar_comm_sim.core.topology import active_subgraph, build_topology


def test_default_topology_is_connected_and_fault_has_backup_connectivity():
    scenario = load_scenario("configs/default_scenario.yaml")
    graph = build_topology(scenario)

    assert graph.number_of_nodes() == 12
    assert graph.number_of_edges() >= 17
    assert nx.is_connected(graph)

    faulted_graph, _ = apply_faults(graph, scenario)
    active = active_subgraph(faulted_graph)

    assert "lander_main_hub" not in active
    assert nx.has_path(active, "ground_station", "rover_1")
    assert nx.has_path(active, "camera_station", "ground_station")
