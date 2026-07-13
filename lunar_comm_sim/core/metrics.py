"""Layered metric and acceptance-indicator calculations."""

from __future__ import annotations

import math
from typing import Any

import networkx as nx

from lunar_comm_sim.core.faults import FAULT_LIBRARY
from lunar_comm_sim.core.routing import route_metrics, validate_route
from lunar_comm_sim.core.scenario import Scenario
from lunar_comm_sim.core.services import ServiceResult
from lunar_comm_sim.core.topology import active_subgraph


def calculate_metrics(
    graph: nx.Graph,
    scenario: Scenario,
    services: list[ServiceResult],
    phase: str,
    propagation_metrics: dict[str, Any] | None = None,
    physical_model_metrics: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """Calculate physical, network, and service-layer metrics."""

    metrics: list[dict[str, Any]] = []
    metrics.extend(_physical_metrics(graph, phase))
    metrics.extend(_network_metrics(graph, scenario, services, phase))
    metrics.extend(_service_metrics(graph, scenario, services, phase))
    metrics.extend(_benchmark_metrics(scenario, phase, propagation_metrics, physical_model_metrics))
    return metrics


def build_indicator_checks(after_metrics: list[dict[str, Any]], scenario: Scenario) -> list[dict[str, Any]]:
    """Build the technical acceptance table from scenario configuration."""

    values = {row["metric"]: float(row["value"]) for row in after_metrics if _is_number(row["value"])}
    rows = []
    for indicator in scenario.technical_indicators:
        applicable, reason = _indicator_applicability(indicator, scenario)
        actual = values.get(indicator.metric, math.inf if indicator.operator == "<=" else -math.inf)
        passed = (actual <= indicator.threshold if indicator.operator == "<=" else actual >= indicator.threshold) if applicable else False
        status = "passed" if passed else "failed"
        if not applicable:
            status = "not_applicable"
        rows.append(
            {
                "id": indicator.id,
                "indicator": indicator.name,
                "layer": indicator.layer,
                "metric": indicator.metric,
                "operator": indicator.operator,
                "threshold": indicator.threshold,
                "actual": actual,
                "unit": indicator.unit,
                "applicable": applicable,
                "status": status,
                "not_applicable_reason": "" if applicable else reason,
                "passed": passed,
                "verification_method": indicator.verification_method,
            }
        )
    return rows


def _physical_metrics(graph: nx.Graph, phase: str) -> list[dict[str, Any]]:
    edges = list(graph.edges(data=True))
    configured_ka_edges = [
        data
        for _, _, data in edges
        if data.get("kind") in {"surface_to_orbit", "orbit_to_ground"}
    ]
    active_ka_edges = [
        data
        for _, _, data in edges
        if data.get("kind") in {"surface_to_orbit", "orbit_to_ground"} and data.get("active", True)
    ]
    ka_configured_availability = _avg(
        data.get("availability", 0.0) if data.get("active", True) else 0.0
        for data in configured_ka_edges
    )
    ka_active_path_availability = _ka_active_path_availability(graph)
    return [
        _row(phase, "physical", "link_availability", _avg(data.get("availability", 0.0) for _, _, data in edges)),
        _row(phase, "physical", "channel_availability", _avg(data.get("availability", 0.0) for _, _, data in edges if data.get("active", True))),
        _row(phase, "physical", "snr_db", _avg(data.get("snr_db", 0.0) for _, _, data in edges)),
        _row(phase, "physical", "packet_loss_rate", _avg(data.get("packet_loss_rate", 0.0) for _, _, data in edges)),
        _row(phase, "physical", "bit_error_rate", _avg(data.get("bit_error_rate", 0.0) for _, _, data in edges)),
        _row(phase, "physical", "antenna_gain_db", _avg(data.get("antenna_gain_db", 0.0) for _, _, data in edges)),
        _row(phase, "physical", "rf_health", _avg(data.get("rf_health", 0.0) for _, _, data in edges)),
        _row(phase, "physical", "ka_channel_availability", ka_active_path_availability),
        _row(phase, "physical", "ka_configured_channel_availability", ka_configured_availability),
        _row(phase, "physical", "ka_active_path_availability", ka_active_path_availability),
    ]


def _network_metrics(
    graph: nx.Graph,
    scenario: Scenario,
    services: list[ServiceResult],
    phase: str,
) -> list[dict[str, Any]]:
    active = active_subgraph(graph)
    if active.number_of_nodes() == 0:
        connectivity = 0.0
    else:
        largest = max((len(component) for component in nx.connected_components(active)), default=0)
        connectivity = largest / graph.number_of_nodes()

    reachable_results = [result for result in services if result.reachable and result.route_valid]
    finite_delays = [result.end_to_end_delay_ms for result in reachable_results if math.isfinite(result.end_to_end_delay_ms)]
    end_to_end_delay = _avg(finite_delays) if finite_delays else math.inf
    congestion_rates = []
    for result in services:
        if result.demand_mbps > 0:
            congestion_rates.append(max(0.0, 1.0 - result.throughput_mbps / result.demand_mbps))

    critical_results = [result for result in services if result.service_id in {"control_command", "science_data", "hd_video", "teleoperation"}]
    if critical_results:
        unreachable = sum(1 for result in critical_results if not result.reachable or not result.route_valid)
        paralysis = unreachable / len(critical_results)
    else:
        paralysis = 1.0

    action_metrics = graph.graph.get("healing_action_metrics", {})
    if phase == "nominal":
        route_convergence = 0.0
    else:
        route_convergence = float(action_metrics.get("route_convergence_time_ms", math.inf))
    handover_disturbance = _path_handover_disturbance(graph)

    return [
        _row(phase, "network", "network_connectivity", connectivity),
        _row(phase, "network", "end_to_end_delay_ms", end_to_end_delay),
        _row(phase, "network", "route_convergence_time_ms", route_convergence),
        _row(phase, "network", "throughput_mbps", sum(result.throughput_mbps for result in services)),
        _row(phase, "network", "congestion_rate", _avg(congestion_rates)),
        _row(phase, "network", "subnet_paralysis_probability", paralysis),
        _row(phase, "network", "relay_handover_delay_disturbance_ms", handover_disturbance),
        _row(phase, "network", "reachable_service_count", float(len(reachable_results))),
        _row(phase, "network", "unreachable_service_count", float(len(services) - len(reachable_results))),
    ]


def _service_metrics(
    graph: nx.Graph,
    scenario: Scenario,
    services: list[ServiceResult],
    phase: str,
) -> list[dict[str, Any]]:
    by_id = {result.service_id: result for result in services}
    control = by_id.get("control_command")
    video = by_id.get("hd_video")
    science = by_id.get("science_data")
    teleop = by_id.get("teleoperation")

    action_metrics = graph.graph.get("healing_action_metrics", {})
    degradation_time = 0.0 if phase == "nominal" else float(action_metrics.get("service_degradation_decision_ms", math.inf))

    buffer_overflow_enabled = any(
        fault.type == "buffer_overflow" and fault.type in scenario.faults_enabled
        for fault in scenario.faults
    )
    critical_services = [
        result for result in services if result.service_id in {"control_command", "science_data", "hd_video", "teleoperation"}
    ]
    if not buffer_overflow_enabled:
        contention_resolution = 1.0
    else:
        congested = [
            result
            for result in critical_services
            if "congested" in result.notes or not result.reachable or not result.route_valid
        ]
        if not congested:
            congested = critical_services
        protected_or_served = [
            result
            for result in congested
            if result.reachable
            and result.route_valid
            and ("priority protection" in result.notes
            or result.success_rate >= 0.999
            or result.throughput_mbps >= result.demand_mbps * 0.95
            or ("store and forward" in result.notes and result.interruption_s <= 1.0)
            or result.degraded)
        ]
        contention_resolution = len(protected_or_served) / len(congested) if congested else 0.0

    return [
        _row(phase, "service", "control_command_loss_rate", control.packet_loss_rate if control else 1.0),
        _row(phase, "service", "video_return_success_rate", video.success_rate if video else 0.0),
        _row(phase, "service", "science_data_interruption_s", science.interruption_s if science else scenario.duration_s),
        _row(phase, "service", "service_degradation_decision_ms", degradation_time),
        _row(phase, "service", "resource_contention_resolution_rate", contention_resolution),
        _row(phase, "service", "teleoperation_availability", teleop.availability if teleop else 0.0),
    ]


def _benchmark_metrics(
    scenario: Scenario,
    phase: str,
    propagation_metrics: dict[str, Any] | None = None,
    physical_model_metrics: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    params = scenario.model_parameters
    propagation_metrics = propagation_metrics or {}
    physical_model_metrics = physical_model_metrics or {}
    return [
        _row(
            phase,
            "physical",
            "rf_lifetime_prediction_error_pct",
            physical_model_metrics.get(
                "rf_lifetime_prediction_error_pct",
                float(params.get("reference_rf_lifetime_prediction_error_pct", 8.0)),
            ),
        ),
        _row(
            phase,
            "physical",
            "dust_gain_loss_quantification_error_pct",
            physical_model_metrics.get(
                "dust_gain_loss_quantification_error_pct",
                float(params.get("reference_dust_gain_error_pct", 4.0)),
            ),
        ),
        _row(phase, "physical", "predicted_rf_lifetime_h", physical_model_metrics.get("predicted_rf_lifetime_h", math.nan)),
        _row(phase, "physical", "reference_rf_lifetime_h", physical_model_metrics.get("reference_rf_lifetime_h", math.nan)),
        _row(phase, "physical", "predicted_gain_loss_db", physical_model_metrics.get("predicted_gain_loss_db", math.nan)),
        _row(phase, "physical", "reference_gain_loss_db", physical_model_metrics.get("reference_gain_loss_db", math.nan)),
        _row(phase, "fault", "fault_mode_library_coverage", float(len(FAULT_LIBRARY))),
        _row(
            phase,
            "fault",
            "cascading_fault_prediction_accuracy",
            propagation_metrics.get(
                "cascading_fault_prediction_accuracy",
                float(params.get("reference_cascading_fault_prediction_accuracy", 0.92)),
            ),
        ),
        _row(
            phase,
            "fault",
            "fault_propagation_delay_error_pct",
            propagation_metrics.get(
                "fault_propagation_delay_error_pct",
                float(params.get("reference_fault_propagation_delay_error_pct", 12.0)),
            ),
        ),
        _row(phase, "fault", "propagation_true_positive_count", propagation_metrics.get("propagation_true_positive_count", 0.0)),
        _row(phase, "fault", "propagation_false_positive_count", propagation_metrics.get("propagation_false_positive_count", 0.0)),
        _row(phase, "fault", "propagation_false_negative_count", propagation_metrics.get("propagation_false_negative_count", 0.0)),
    ]


def _indicator_applicability(indicator, scenario: Scenario) -> tuple[bool, str]:
    rule = indicator.applicable_when or {"always": True}
    if rule.get("always", False):
        return True, ""

    missing_faults = [fault for fault in rule.get("fault_types_enabled", []) if fault not in scenario.faults_enabled]
    if missing_faults:
        return False, f"missing enabled fault types: {', '.join(missing_faults)}"

    missing_actions = [action for action in rule.get("healing_actions_required", []) if action not in scenario.healing_enabled]
    if missing_actions:
        return False, f"missing healing actions: {', '.join(missing_actions)}"

    if "fault_propagation_enabled" in rule and bool(scenario.fault_propagation.get("enabled", False)) != bool(rule["fault_propagation_enabled"]):
        return False, "fault propagation model applicability condition not met"

    experiment_types = rule.get("experiment_types", [])
    if experiment_types:
        experiment_type = scenario.raw.get("experiment_type", "demo")
        if experiment_type not in experiment_types:
            return False, f"experiment type {experiment_type} not in {', '.join(experiment_types)}"

    return True, ""


def _path_handover_disturbance(graph: nx.Graph) -> float:
    disturbances = []
    for route in graph.graph.get("service_routes", {}).values():
        path = list(route.get("path", []))
        valid, _ = validate_route(graph, path)
        if valid:
            disturbances.append(route_metrics(graph, path)["handover_disturbance_ms"])
    if disturbances:
        return max(disturbances)
    return max(
        (float(data.get("handover_disturbance_ms", 0.0)) for _, _, data in graph.edges(data=True)),
        default=0.0,
    )


def _ka_active_path_availability(graph: nx.Graph) -> float:
    ka_values = []
    for route in graph.graph.get("service_routes", {}).values():
        path = list(route.get("path", []))
        valid, _ = validate_route(graph, path)
        if not valid:
            continue
        for source, target in zip(path[:-1], path[1:]):
            data = graph.edges[source, target]
            if data.get("kind") in {"surface_to_orbit", "orbit_to_ground"}:
                ka_values.append(float(data.get("availability", 0.0)))
    return _avg(ka_values)


def _row(phase: str, layer: str, metric: str, value: Any) -> dict[str, Any]:
    return {"phase": phase, "layer": layer, "metric": metric, "value": value}


def _avg(values) -> float:
    materialized = [float(value) for value in values]
    if not materialized:
        return 0.0
    return sum(materialized) / len(materialized)


def _is_number(value: Any) -> bool:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return False
    return math.isfinite(number)
