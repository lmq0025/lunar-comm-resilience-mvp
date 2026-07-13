"""Explicit service routing table helpers."""

from __future__ import annotations

from typing import Any

import networkx as nx

from lunar_comm_sim.core.environment import clamp
from lunar_comm_sim.core.scenario import Scenario
from lunar_comm_sim.core.topology import active_subgraph


def compute_service_routes(graph: nx.Graph, scenario: Scenario) -> dict[str, dict[str, Any]]:
    """Compute one active path for each configured service."""

    active = active_subgraph(graph)
    routes: dict[str, dict[str, Any]] = {}
    for service in scenario.services:
        try:
            path = nx.shortest_path(active, service.source, service.target, weight="delay_ms")
            valid, notes = validate_route(graph, path)
            routes[service.id] = {
                "path": path,
                "valid": valid,
                "source": "computed",
                "notes": notes,
            }
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            routes[service.id] = {
                "path": [],
                "valid": False,
                "source": "computed",
                "notes": "no active path",
            }
    return routes


def validate_route(graph: nx.Graph, route: list[str] | tuple[str, ...] | None) -> tuple[bool, str]:
    """Check that every node and edge on a route is currently usable."""

    if not route:
        return False, "missing route"
    for node in route:
        if node not in graph:
            return False, f"missing node {node}"
        if not graph.nodes[node].get("active", True):
            return False, f"inactive node {node}"
    for source, target in zip(route[:-1], route[1:]):
        if not graph.has_edge(source, target):
            return False, f"missing edge {source}->{target}"
        edge = graph.edges[source, target]
        if not edge.get("active", True):
            return False, f"inactive edge {source}->{target}"
        if float(edge.get("availability", 0.0)) <= 0.0:
            return False, f"unavailable edge {source}->{target}"
    return True, ""


def route_to_string(route: list[str] | tuple[str, ...] | None) -> str:
    """Format a route for CSV and reports."""

    return " -> ".join(route or [])


def route_metrics(graph: nx.Graph, route: list[str] | tuple[str, ...]) -> dict[str, float]:
    """Calculate aggregate path metrics for a route."""

    edge_data = [graph.edges[u, v] for u, v in zip(route[:-1], route[1:])]
    bottleneck = min((float(data.get("bandwidth_mbps", 0.0)) for data in edge_data), default=0.0)
    total_delay = sum(float(data.get("delay_ms", 0.0)) for data in edge_data)
    availability = _product(float(data.get("availability", 0.0)) for data in edge_data)
    success_no_loss = _product(1.0 - float(data.get("packet_loss_rate", 0.0)) for data in edge_data)
    packet_loss = clamp(1.0 - success_no_loss, 0.0, 1.0)
    handover = max((float(data.get("handover_disturbance_ms", 0.0)) for data in edge_data), default=0.0)
    congestion = max((float(data.get("congestion_multiplier", 1.0)) for data in edge_data), default=1.0)
    node_delay = sum(float(graph.nodes[node].get("node_processing_delay_ms", 0.0)) for node in route)
    return {
        "bottleneck_bandwidth_mbps": bottleneck,
        "total_delay_ms": total_delay + node_delay,
        "packet_loss_rate": packet_loss,
        "availability": availability,
        "handover_disturbance_ms": handover,
        "congestion_multiplier": congestion,
        "node_processing_delay_ms": node_delay,
    }


def build_routing_table(
    graph: nx.Graph,
    scenario: Scenario,
    recompute: bool = True,
    inherited_routes: dict[str, dict[str, Any]] | None = None,
    route_source: str | None = None,
) -> dict[str, dict[str, Any]]:
    """Build a routing table by computing new routes or validating inherited routes."""

    if recompute:
        routes = compute_service_routes(graph, scenario)
        if route_source:
            for route in routes.values():
                route["source"] = route_source
        return routes

    source_routes = inherited_routes or graph.graph.get("service_routes", {})
    routes: dict[str, dict[str, Any]] = {}
    for service in scenario.services:
        inherited = source_routes.get(service.id, {})
        path = list(inherited.get("path", []))
        valid, notes = validate_route(graph, path)
        routes[service.id] = {
            "path": path,
            "valid": valid,
            "source": route_source or inherited.get("source", "inherited"),
            "notes": notes or inherited.get("notes", ""),
        }
    return routes


def service_routes_as_rows(graph: nx.Graph, scenario: Scenario, phase: str) -> list[dict[str, object]]:
    """Export the current routing table as CSV-ready rows."""

    rows = []
    routes = graph.graph.get("service_routes", {})
    for service in scenario.services:
        route = routes.get(service.id, {"path": [], "valid": False, "source": "missing", "notes": "missing route"})
        path = list(route.get("path", []))
        valid, validation_notes = validate_route(graph, path)
        rows.append(
            {
                "phase": phase,
                "service_id": service.id,
                "source": service.source,
                "target": service.target,
                "path": route_to_string(path),
                "valid": bool(route.get("valid", False)) and valid,
                "route_source": route.get("source", ""),
                "notes": validation_notes or route.get("notes", ""),
            }
        )
    return rows


def _product(values) -> float:
    result = 1.0
    for value in values:
        result *= value
    return result
