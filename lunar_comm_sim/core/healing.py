"""Self-healing policy implementation."""

from __future__ import annotations

from dataclasses import asdict, dataclass
import math

import networkx as nx

from lunar_comm_sim.core.routing import build_routing_table, validate_route
from lunar_comm_sim.core.scenario import Scenario


HEALING_STRATEGIES = {
    "reroute_backup_path": "Recompute routes over active backup paths.",
    "priority_scheduling": "Reserve contention handling for control and teleoperation traffic.",
    "service_degradation": "Lower HD video bandwidth demand under congestion.",
    "store_and_forward": "Buffer science data and resume forwarding after outage.",
    "relay_pre_handover": "Pre-stage relay handover to bound delay disturbance.",
}


def is_enabled(scenario: Scenario, strategy: str) -> bool:
    return strategy in scenario.healing_enabled


@dataclass(frozen=True)
class HealingActionRecord:
    time_s: float
    strategy: str
    target: str
    action: str
    success: bool
    measured_response_ms: float
    notes: str


def apply_healing(graph: nx.Graph, scenario: Scenario) -> tuple[nx.Graph, list[HealingActionRecord]]:
    """Apply configured self-healing strategies to a faulted graph copy."""

    healed = initialize_healing_state(graph, scenario)
    actions = apply_non_routing_healing(healed, scenario)
    actions.extend(apply_reroute_healing(healed, scenario))
    return healed, actions


def initialize_healing_state(graph: nx.Graph, scenario: Scenario) -> nx.Graph:
    """Create an after-healing graph copy with self-healing state containers."""

    healed = graph.copy()
    healed.graph["stage"] = "after_healing"
    healed.graph.setdefault("protected_services", {})
    healed.graph.setdefault("degraded_services", {})
    healed.graph.setdefault("buffered_services", {})
    healed.graph.setdefault("healing_action_metrics", {})
    healed.graph["pre_healing_invalid_services"] = _invalid_services_from_current_routes(healed, scenario)
    healed.graph["pending_route_recalculation"] = is_enabled(scenario, "reroute_backup_path")
    return healed


def apply_non_routing_healing(graph: nx.Graph, scenario: Scenario) -> list[HealingActionRecord]:
    """Apply enabled healing strategies that do not recompute service routes."""

    actions: list[HealingActionRecord] = []
    for strategy in scenario.healing_enabled:
        if strategy == "reroute_backup_path":
            graph.graph["pending_route_recalculation"] = True
        elif strategy == "priority_scheduling":
            actions.append(_priority_scheduling(graph, scenario))
        elif strategy == "service_degradation":
            actions.append(_service_degradation(graph, scenario))
        elif strategy == "store_and_forward":
            actions.append(_store_and_forward(graph, scenario))
        elif strategy == "relay_pre_handover":
            actions.append(_relay_pre_handover(graph, scenario))
    return actions


def apply_reroute_healing(graph: nx.Graph, scenario: Scenario) -> list[HealingActionRecord]:
    """Apply route recomputation when the reroute strategy is enabled."""

    if not is_enabled(scenario, "reroute_backup_path"):
        graph.graph["service_routes"] = build_routing_table(
            graph,
            scenario,
            recompute=False,
            inherited_routes=graph.graph.get("service_routes", {}),
            route_source="healing_verified_inherited",
        )
        graph.graph["pending_route_recalculation"] = False
        graph.graph["reroute_success"] = False
        return []

    action = _reroute_backup_path(graph, scenario)
    graph.graph["pending_route_recalculation"] = False
    return [action]


def healing_actions_as_rows(actions: list[HealingActionRecord]) -> list[dict[str, object]]:
    return [asdict(action) for action in actions]


def _invalid_services_from_current_routes(graph: nx.Graph, scenario: Scenario) -> set[str]:
    invalid = set()
    routes = graph.graph.get("service_routes", {})
    for service in scenario.services:
        route = routes.get(service.id, {})
        valid, _ = validate_route(graph, list(route.get("path", [])))
        if not valid:
            invalid.add(service.id)
    return invalid


def _reroute_backup_path(graph: nx.Graph, scenario: Scenario) -> HealingActionRecord:
    old_routes = graph.graph.get("service_routes", {})
    new_routes = build_routing_table(graph, scenario, recompute=True, route_source="reroute_backup_path")
    graph.graph["service_routes"] = new_routes

    rerouted = 0
    failed: list[str] = []
    for service in scenario.services:
        route = new_routes.get(service.id, {})
        if route.get("valid"):
            if route.get("path") != old_routes.get(service.id, {}).get("path"):
                rerouted += 1
        else:
            failed.append(service.id)

    success = rerouted > 0
    response_ms = float(scenario.model_parameters.get("routing_convergence_ms", 35)) if success else math.inf
    graph.graph["healing_action_metrics"]["route_convergence_time_ms"] = response_ms
    graph.graph["reroute_success"] = success
    notes = f"rerouted services: {rerouted}; failed services: {len(failed)}"
    if failed:
        notes = f"{notes}; failed list: {', '.join(failed)}"
    return HealingActionRecord(30.0, "reroute_backup_path", "active_topology", "recompute active backup paths", success, response_ms, notes)


def _priority_scheduling(graph: nx.Graph, scenario: Scenario) -> HealingActionRecord:
    protected = graph.graph["protected_services"]
    targets = []
    for service in scenario.services:
        if service.id in {"control_command", "teleoperation"}:
            protected[service.id] = {
                "protection_level": 0.95,
                "reserved_bandwidth_mbps": float(service.required_bandwidth_mbps),
            }
            targets.append(service.id)
    response_ms = float(scenario.model_parameters.get("priority_scheduling_response_ms", 80))
    graph.graph["healing_action_metrics"]["priority_scheduling_response_ms"] = response_ms
    return HealingActionRecord(31.0, "priority_scheduling", ",".join(targets), "reserve bandwidth and loss protection", bool(targets), response_ms, "protected high-priority services")


def _service_degradation(graph: nx.Graph, scenario: Scenario) -> HealingActionRecord:
    degraded = graph.graph["degraded_services"]
    target = "hd_video"
    service = next((item for item in scenario.services if item.id == target), None)
    success = service is not None and service.degraded_bandwidth_mbps is not None
    if success:
        degraded[target] = {
            "degraded": True,
            "bandwidth_mbps": float(service.degraded_bandwidth_mbps),
        }
    response_ms = float(scenario.model_parameters.get("service_degradation_decision_ms", 120)) if success else math.inf
    graph.graph["healing_action_metrics"]["service_degradation_decision_ms"] = response_ms
    notes = "HD video bitrate reduced to degraded_bandwidth_mbps" if success else "hd_video degraded bandwidth not configured"
    return HealingActionRecord(32.0, "service_degradation", target, "reduce service bandwidth demand", success, response_ms, notes)


def _store_and_forward(graph: nx.Graph, scenario: Scenario) -> HealingActionRecord:
    buffered = graph.graph["buffered_services"]
    target = "science_data"
    service = next((item for item in scenario.services if item.id == target), None)
    success = service is not None
    response_ms = float(scenario.model_parameters.get("store_and_forward_response_ms", 420)) if success else math.inf
    if success:
        buffered[target] = {
            "buffered": True,
            "recovery_time_s": response_ms / 1000.0,
        }
    graph.graph["healing_action_metrics"]["store_and_forward_response_ms"] = response_ms
    notes = "science data buffered for resume forwarding" if success else "science_data service missing"
    return HealingActionRecord(33.0, "store_and_forward", target, "enable buffer and resume forwarding", success, response_ms, notes)


def _relay_pre_handover(graph: nx.Graph, scenario: Scenario) -> HealingActionRecord:
    target_disturbance = float(scenario.model_parameters.get("relay_pre_handover_disturbance_ms", 35))
    changed = 0
    for _, _, data in graph.edges(data=True):
        current = float(data.get("handover_disturbance_ms", 0.0))
        if current > target_disturbance and data.get("kind") in {"surface_to_orbit", "orbit_to_ground"}:
            data["delay_ms"] = float(data.get("delay_ms", 0.0)) - current + target_disturbance
            data["handover_disturbance_ms"] = target_disturbance
            changed += 1
    success = changed > 0
    graph.graph["healing_action_metrics"]["relay_handover_delay_disturbance_ms"] = target_disturbance if success else 0.0
    notes = f"updated {changed} relay links" if success else "no handover disturbance found"
    return HealingActionRecord(34.0, "relay_pre_handover", "relay_links", "pre-stage handover and reduce disturbance", success, target_disturbance if success else 0.0, notes)
