from lunar_comm_sim.core.metrics import calculate_metrics
from lunar_comm_sim.core.routing import build_routing_table
from lunar_comm_sim.core.scenario import load_scenario
from lunar_comm_sim.core.services import simulate_services
from lunar_comm_sim.core.topology import build_topology


def _metric(metrics: list[dict], metric: str) -> float:
    return float(next(row["value"] for row in metrics if row["metric"] == metric))


def test_ka_configured_and_active_path_availability_have_separate_definitions():
    scenario = load_scenario("configs/default_scenario.yaml")
    graph = build_topology(scenario)
    graph.graph["service_routes"] = build_routing_table(graph, scenario, route_source="nominal_computed")
    baseline_services = simulate_services(graph, scenario, "nominal")
    baseline_metrics = calculate_metrics(graph, scenario, baseline_services, "nominal")

    graph.edges["relay_backup_2", "lunar_orbiter"]["active"] = False
    graph.edges["relay_backup_2", "lunar_orbiter"]["availability"] = 0.0
    graph.graph["service_routes"] = build_routing_table(graph, scenario, route_source="nominal_computed")
    changed_services = simulate_services(graph, scenario, "nominal")
    changed_metrics = calculate_metrics(graph, scenario, changed_services, "nominal")

    assert _metric(changed_metrics, "ka_configured_channel_availability") < _metric(
        baseline_metrics, "ka_configured_channel_availability"
    )
    assert _metric(changed_metrics, "ka_active_path_availability") == _metric(
        baseline_metrics, "ka_active_path_availability"
    )
