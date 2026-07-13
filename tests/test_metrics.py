from lunar_comm_sim.core.faults import apply_faults
from lunar_comm_sim.core.healing import apply_healing
from lunar_comm_sim.core.metrics import build_indicator_checks, calculate_metrics
from lunar_comm_sim.core.scenario import load_scenario
from lunar_comm_sim.core.services import simulate_services
from lunar_comm_sim.core.topology import build_topology


def test_after_healing_metrics_satisfy_indicator_table():
    scenario = load_scenario("configs/default_scenario.yaml")
    graph = build_topology(scenario)
    faulted_graph, _ = apply_faults(graph, scenario)
    healed_graph, _ = apply_healing(faulted_graph, scenario)
    services = simulate_services(healed_graph, scenario, phase="after_healing")
    metrics = calculate_metrics(healed_graph, scenario, services, phase="after_healing")
    indicators = build_indicator_checks(metrics, scenario)

    metric_names = {row["metric"] for row in metrics}
    assert {"link_availability", "network_connectivity", "control_command_loss_rate", "route_convergence_time_ms"} <= metric_names
    assert all(row["passed"] for row in indicators)
