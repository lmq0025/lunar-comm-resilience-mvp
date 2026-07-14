"""Structured snapshots for staged simulation state."""

from __future__ import annotations

from typing import Any

import networkx as nx

from lunar_comm_sim.core.routing import route_metrics, validate_route
from lunar_comm_sim.core.scenario import Scenario


def graph_snapshot(graph: nx.Graph, scenario: Scenario, stage: str | None = None) -> dict[str, Any]:
    """Serialize a NetworkX graph into frontend-friendly topology data."""

    snapshot_stage = stage or str(graph.graph.get("stage", "unknown"))
    return {
        "stage": snapshot_stage,
        "summary": graph_summary(graph),
        "nodes": [_node_snapshot(node_id, data) for node_id, data in graph.nodes(data=True)],
        "links": [_link_snapshot(source, target, data) for source, target, data in graph.edges(data=True)],
        "routes": routes_snapshot(graph, scenario),
    }


def graph_summary(graph: nx.Graph) -> dict[str, int]:
    """Return configured and active node/link counts."""

    return {
        "node_count": graph.number_of_nodes(),
        "edge_count": graph.number_of_edges(),
        "active_node_count": sum(1 for _, data in graph.nodes(data=True) if data.get("active", True)),
        "active_edge_count": sum(
            1
            for _, _, data in graph.edges(data=True)
            if data.get("active", True) and float(data.get("availability", 0.0)) > 0.0
        ),
    }


def routes_snapshot(graph: nx.Graph, scenario: Scenario) -> dict[str, dict[str, Any]]:
    """Serialize the service routing table with aggregate path metrics."""

    routes = graph.graph.get("service_routes", {})
    rows: dict[str, dict[str, Any]] = {}
    for service in scenario.services:
        route = routes.get(service.id, {})
        path = list(route.get("path", []))
        valid, validation_notes = validate_route(graph, path)
        metrics = route_metrics(graph, path) if valid else {}
        rows[service.id] = {
            "service_id": service.id,
            "source": service.source,
            "target": service.target,
            "path": path,
            "valid": bool(route.get("valid", False)) and valid,
            "route_source": route.get("source"),
            "notes": validation_notes or route.get("notes", ""),
            "bottleneck_bandwidth_mbps": metrics.get("bottleneck_bandwidth_mbps"),
            "total_delay_ms": metrics.get("total_delay_ms"),
            "packet_loss_rate": metrics.get("packet_loss_rate"),
            "availability": metrics.get("availability"),
            "handover_disturbance_ms": metrics.get("handover_disturbance_ms"),
        }
    return rows


def metric_delta_rows(
    nominal_metrics: list[dict[str, Any]],
    before_metrics: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Compare before-healing metrics with nominal metrics."""

    nominal = {(row["layer"], row["metric"]): row.get("value") for row in nominal_metrics}
    deltas: list[dict[str, Any]] = []
    for row in before_metrics:
        key = (row["layer"], row["metric"])
        before_value = row.get("value")
        nominal_value = nominal.get(key)
        delta: float | None
        try:
            delta = float(before_value) - float(nominal_value)
        except (TypeError, ValueError):
            delta = None
        deltas.append(
            {
                "layer": row["layer"],
                "metric": row["metric"],
                "nominal_value": nominal_value,
                "before_healing_value": before_value,
                "delta": delta,
            }
        )
    return deltas


def _node_snapshot(node_id: str, data: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": node_id,
        "name": data.get("name"),
        "type": data.get("type"),
        "role": data.get("role"),
        "active": data.get("active", True),
        "availability": data.get("availability"),
        "position_x": data.get("position_x"),
        "position_y": data.get("position_y"),
        "node_processing_delay_ms": data.get("node_processing_delay_ms"),
    }


def _link_snapshot(source: str, target: str, data: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": data.get("id"),
        "source": source,
        "target": target,
        "kind": data.get("kind"),
        "active": data.get("active", True),
        "bandwidth_mbps": data.get("bandwidth_mbps"),
        "base_bandwidth_mbps": data.get("base_bandwidth_mbps"),
        "delay_ms": data.get("delay_ms"),
        "base_delay_ms": data.get("base_delay_ms"),
        "packet_loss_rate": data.get("packet_loss_rate"),
        "base_packet_loss_rate": data.get("base_packet_loss_rate"),
        "availability": data.get("availability"),
        "base_availability": data.get("base_availability"),
        "snr_db": data.get("snr_db"),
        "antenna_gain_db": data.get("antenna_gain_db"),
        "handover_disturbance_ms": data.get("handover_disturbance_ms"),
        "congestion_multiplier": data.get("congestion_multiplier"),
    }
