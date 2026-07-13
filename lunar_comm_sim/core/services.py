"""Business-flow simulation over active topology paths."""

from __future__ import annotations

from dataclasses import asdict, dataclass

import networkx as nx

from lunar_comm_sim.core.environment import clamp
from lunar_comm_sim.core.routing import route_metrics, route_to_string, validate_route
from lunar_comm_sim.core.scenario import Scenario, ServiceConfig


@dataclass(frozen=True)
class ServiceResult:
    phase: str
    service_id: str
    source: str
    target: str
    path: str
    reachable: bool
    demand_mbps: float
    throughput_mbps: float
    end_to_end_delay_ms: float
    packet_loss_rate: float
    availability: float
    success_rate: float
    interruption_s: float
    degraded: bool
    route_valid: bool
    route_source: str
    failure_reason: str
    notes: str


def simulate_services(graph: nx.Graph, scenario: Scenario, phase: str) -> list[ServiceResult]:
    """Evaluate each configured service on the current topology."""

    results: list[ServiceResult] = []
    for service in sorted(scenario.services, key=lambda item: item.priority):
        results.append(_simulate_one(graph, service, scenario, phase))
    return results


def service_results_as_rows(results: list[ServiceResult]) -> list[dict[str, object]]:
    return [asdict(result) for result in results]


def _simulate_one(
    graph: nx.Graph,
    service: ServiceConfig,
    scenario: Scenario,
    phase: str,
) -> ServiceResult:
    protected_services = graph.graph.get("protected_services", {})
    degraded_services = graph.graph.get("degraded_services", {})
    buffered_services = graph.graph.get("buffered_services", {})

    demand = float(service.required_bandwidth_mbps)
    degraded = False
    notes = []
    if service.id in degraded_services and service.degraded_bandwidth_mbps is not None:
        demand = float(degraded_services[service.id].get("bandwidth_mbps", service.degraded_bandwidth_mbps))
        degraded = True
        notes.append("bitrate degraded")

    route = graph.graph.get("service_routes", {}).get(service.id)
    if not route:
        interruption = _interruption_for_unreachable(service, scenario, graph)
        return ServiceResult(
            phase=phase,
            service_id=service.id,
            source=service.source,
            target=service.target,
            path="",
            reachable=False,
            demand_mbps=demand,
            throughput_mbps=0.0,
            end_to_end_delay_ms=float("inf"),
            packet_loss_rate=1.0,
            availability=0.0,
            success_rate=0.0,
            interruption_s=interruption,
            degraded=degraded,
            route_valid=False,
            route_source="missing",
            failure_reason="missing route",
            notes="unreachable",
        )

    path_nodes = list(route.get("path", []))
    route_valid, failure_reason = validate_route(graph, path_nodes)
    if not route_valid:
        interruption = _interruption_for_unreachable(service, scenario, graph)
        return ServiceResult(
            phase=phase,
            service_id=service.id,
            source=service.source,
            target=service.target,
            path=route_to_string(path_nodes),
            reachable=False,
            demand_mbps=demand,
            throughput_mbps=0.0,
            end_to_end_delay_ms=float("inf"),
            packet_loss_rate=1.0,
            availability=0.0,
            success_rate=0.0,
            interruption_s=interruption,
            degraded=degraded,
            route_valid=False,
            route_source=str(route.get("source", "")),
            failure_reason=failure_reason,
            notes="unreachable",
        )

    metrics = route_metrics(graph, path_nodes)
    capacity = metrics["bottleneck_bandwidth_mbps"]
    congestion_multiplier = metrics["congestion_multiplier"]
    protection = protected_services.get(service.id, {})
    protection_level = float(protection.get("protection_level", 0.0))
    reserved_bandwidth = float(protection.get("reserved_bandwidth_mbps", 0.0))
    if degraded and service.id == "hd_video":
        effective_demand = demand * (1.0 + (congestion_multiplier - 1.0) * 0.05)
    else:
        effective_demand = demand * congestion_multiplier
    delay = metrics["total_delay_ms"]
    availability = metrics["availability"]
    packet_loss = metrics["packet_loss_rate"]
    if protection_level > 0.0:
        packet_loss = clamp(packet_loss * (1.0 - 0.80 * protection_level), 0.0, 1.0)
        notes.append("priority protection")

    effective_capacity = capacity + reserved_bandwidth
    capacity_ratio = 1.0 if effective_demand <= 0 else clamp(effective_capacity / effective_demand, 0.0, 1.0)
    if service.id == "hd_video":
        success_rate = clamp((1.0 - packet_loss) * capacity_ratio, 0.0, 1.0)
    else:
        success_rate = clamp(availability * (1.0 - packet_loss) * capacity_ratio, 0.0, 1.0)
    throughput = min(demand, capacity / congestion_multiplier) * success_rate

    if service.id == "science_data" and service.id in buffered_services:
        recovery_time = _store_and_forward_interruption_s(service, scenario, graph)
        congestion_outage = max(0.0, 1.0 - capacity_ratio) * scenario.duration_s
        if service.id in graph.graph.get("pre_healing_invalid_services", set()):
            interruption = recovery_time
        else:
            interruption = min(congestion_outage, recovery_time)
        notes.append("store and forward")
    else:
        interruption = 0.0 if capacity_ratio >= 1.0 and success_rate > 0.0 else max(0.0, 1.0 - capacity_ratio) * scenario.duration_s

    if service.max_delay_ms is not None and delay > service.max_delay_ms:
        notes.append("delay target exceeded")
    if capacity_ratio < 1.0:
        notes.append("congested")

    return ServiceResult(
        phase=phase,
        service_id=service.id,
        source=service.source,
        target=service.target,
        path=route_to_string(path_nodes),
        reachable=True,
        demand_mbps=demand,
        throughput_mbps=throughput,
        end_to_end_delay_ms=delay,
        packet_loss_rate=packet_loss,
        availability=availability,
        success_rate=success_rate,
        interruption_s=interruption,
        degraded=degraded,
        route_valid=True,
        route_source=str(route.get("source", "")),
        failure_reason="",
        notes="; ".join(notes),
    )


def _interruption_for_unreachable(service: ServiceConfig, scenario: Scenario, graph: nx.Graph) -> float:
    buffered = graph.graph.get("buffered_services", {})
    if service.id == "science_data" and service.id in buffered:
        if not graph.graph.get("reroute_success", False):
            return scenario.duration_s
        return _store_and_forward_interruption_s(service, scenario, graph)
    return scenario.duration_s


def _store_and_forward_interruption_s(service: ServiceConfig, scenario: Scenario, graph: nx.Graph) -> float:
    buffered = graph.graph.get("buffered_services", {})
    store_response_s = float(buffered.get(service.id, {}).get("recovery_time_s", 0.0))
    route_convergence_s = float(graph.graph.get("healing_action_metrics", {}).get("route_convergence_time_ms", 0.0)) / 1000.0
    configured_outage_s = _configured_outage_s(scenario)
    recovery_s = route_convergence_s + store_response_s
    if configured_outage_s <= 0.0:
        return recovery_s
    return min(configured_outage_s, recovery_s)


def _configured_outage_s(scenario: Scenario) -> float:
    durations = [
        float(fault.duration_s)
        for fault in scenario.faults
        if fault.type in scenario.faults_enabled and fault.type in {"main_hub_failure", "terrain_obstruction", "relay_handover_delay"}
    ]
    return max(durations, default=0.0)
