"""Fault propagation prediction and comparison models."""

from __future__ import annotations

import math
from typing import Any

import networkx as nx

from lunar_comm_sim.core.faults import FaultEventRecord
from lunar_comm_sim.core.scenario import Scenario
from lunar_comm_sim.core.services import ServiceResult


def build_propagation_graph(scenario: Scenario) -> nx.DiGraph:
    """Build a directed fault propagation graph from scenario configuration."""

    graph = nx.DiGraph()
    config = scenario.fault_propagation or {}
    for node in config.get("nodes", []):
        graph.add_node(node["id"], layer=node.get("layer", "unknown"))
    for edge in config.get("edges", []):
        graph.add_edge(
            edge["source"],
            edge["target"],
            probability=float(edge.get("probability", 1.0)),
            delay_ms=float(edge.get("delay_ms", 0.0)),
        )
    return graph


def predict_fault_propagation(fault_records: list[FaultEventRecord], scenario: Scenario) -> list[dict[str, Any]]:
    """Predict cascading effects for injected root faults."""

    if not scenario.fault_propagation.get("enabled", False):
        return []

    graph = build_propagation_graph(scenario)
    predictions: list[dict[str, Any]] = []
    for fault in fault_records:
        root = fault.fault_type
        if root not in graph:
            continue
        for target in nx.descendants(graph, root):
            paths = list(nx.all_simple_paths(graph, root, target, cutoff=6))
            if not paths:
                continue
            path = min(paths, key=len)
            probability = 1.0
            delay = 0.0
            for source, next_node in zip(path[:-1], path[1:]):
                edge = graph.edges[source, next_node]
                probability *= float(edge.get("probability", 1.0))
                delay += float(edge.get("delay_ms", 0.0))
            predictions.append(
                {
                    "root_fault": root,
                    "predicted_effect": target,
                    "predicted_layer": graph.nodes[target].get("layer", "unknown"),
                    "predicted_probability": probability,
                    "predicted_delay_ms": delay,
                    "propagation_path": " -> ".join(path),
                    "confidence": probability,
                }
            )
    return predictions


def extract_observed_impacts(
    fault_records: list[FaultEventRecord],
    service_results: list[ServiceResult],
    metrics: list[dict[str, Any]],
    service_routes: list[dict[str, Any]],
    scenario: Scenario,
) -> list[dict[str, Any]]:
    """Extract observed impacts from simulation outputs."""

    observed: dict[str, dict[str, Any]] = {}
    metric = _metric_lookup(metrics)
    before_services = [result for result in service_results if result.phase == "before_healing"]

    def add(effect: str, layer: str, source: str, delay_ms: float, evidence: str) -> None:
        observed.setdefault(
            effect,
            {
                "observed_effect": effect,
                "observed_layer": layer,
                "source": source,
                "observed_delay_ms": delay_ms,
                "evidence": evidence,
            },
        )

    if any(row.get("phase") == "before_healing" and str(row.get("valid")).lower() == "false" for row in service_routes):
        add("route_invalid", "network", "service_routes", _observed_delay_ms(scenario, "main_hub_failure", "route_invalid"), "before_healing route_valid=false")

    if any(not result.reachable for result in before_services):
        add("service_unreachable", "service", "service_results", _observed_delay_ms(scenario, "main_hub_failure", "service_unreachable"), "before_healing service reachable=false")

    if metric("before_healing", "snr_db") < metric("nominal", "snr_db"):
        add("snr_degradation", "physical", "metrics", _observed_delay_ms(scenario, "dust_antenna_degradation", "snr_degradation"), "before_healing snr_db below nominal")

    if metric("before_healing", "packet_loss_rate") > metric("nominal", "packet_loss_rate"):
        add("packet_loss_increase", "physical", "metrics", _observed_delay_ms(scenario, "dust_antenna_degradation", "packet_loss_increase"), "before_healing packet_loss_rate above nominal")

    if metric("before_healing", "relay_handover_delay_disturbance_ms") > 0 or metric("before_healing", "end_to_end_delay_ms") > metric("nominal", "end_to_end_delay_ms"):
        add("end_to_end_delay_increase", "network", "metrics", _observed_delay_ms(scenario, "relay_handover_delay", "end_to_end_delay_increase"), "handover disturbance or delay increase observed")

    if metric("before_healing", "congestion_rate") > metric("nominal", "congestion_rate"):
        add("congestion_increase", "network", "metrics", _observed_delay_ms(scenario, "buffer_overflow", "congestion_increase"), "before_healing congestion_rate above nominal")

    if any(result.success_rate < 0.999 for result in before_services):
        add("service_qos_drop", "service", "service_results", _observed_delay_ms(scenario, "buffer_overflow", "service_qos_drop"), "before_healing service success_rate below 0.999")

    science = next((result for result in before_services if result.service_id == "science_data"), None)
    if science and science.interruption_s > 0:
        add("science_data_interruption", "service", "service_results", _observed_delay_ms(scenario, "main_hub_failure", "science_data_interruption"), "science_data interruption_s > 0")

    video = next((result for result in before_services if result.service_id == "hd_video"), None)
    if video and video.success_rate < 0.999:
        add("video_return_failure", "service", "service_results", _observed_delay_ms(scenario, "buffer_overflow", "video_return_failure"), "hd_video success_rate below target")

    return list(observed.values())


def compare_propagation_prediction(
    predictions: list[dict[str, Any]],
    observed_impacts: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Compare predicted effects with observed impacts."""

    predicted_by_effect = {row["predicted_effect"]: row for row in predictions}
    observed_by_effect = {row["observed_effect"]: row for row in observed_impacts}
    effects = sorted(set(predicted_by_effect) | set(observed_by_effect))
    rows = []
    for effect in effects:
        prediction = predicted_by_effect.get(effect, {})
        observed = observed_by_effect.get(effect)
        true_positive = effect in predicted_by_effect and observed is not None
        false_positive = effect in predicted_by_effect and observed is None
        false_negative = effect not in predicted_by_effect and observed is not None
        predicted_delay = float(prediction.get("predicted_delay_ms", math.inf))
        observed_delay = float(observed.get("observed_delay_ms", math.inf)) if observed else math.inf
        if true_positive and math.isfinite(predicted_delay) and math.isfinite(observed_delay) and observed_delay > 0:
            delay_error = abs(predicted_delay - observed_delay) / observed_delay * 100.0
        else:
            delay_error = math.inf
        rows.append(
            {
                "predicted_effect": effect,
                "observed": observed is not None,
                "true_positive": true_positive,
                "false_positive": false_positive,
                "false_negative": false_negative,
                "predicted_delay_ms": predicted_delay,
                "observed_delay_ms": observed_delay,
                "delay_error_pct": delay_error,
            }
        )
    return rows


def calculate_propagation_metrics(comparison_rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Calculate propagation prediction accuracy and delay error."""

    true_positive_count = sum(1 for row in comparison_rows if row["true_positive"])
    false_positive_count = sum(1 for row in comparison_rows if row["false_positive"])
    false_negative_count = sum(1 for row in comparison_rows if row["false_negative"])
    union_count = len(comparison_rows)
    accuracy = true_positive_count / union_count if union_count else math.inf
    delay_errors = [
        float(row["delay_error_pct"])
        for row in comparison_rows
        if row["true_positive"] and math.isfinite(float(row["delay_error_pct"]))
    ]
    delay_error = sum(delay_errors) / len(delay_errors) if delay_errors else math.inf
    return {
        "cascading_fault_prediction_accuracy": accuracy,
        "fault_propagation_delay_error_pct": delay_error,
        "propagation_true_positive_count": float(true_positive_count),
        "propagation_false_positive_count": float(false_positive_count),
        "propagation_false_negative_count": float(false_negative_count),
    }


def propagation_metrics_as_rows(metrics: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "metric": key,
            "value": value,
            "method": "MVP fault propagation graph prediction compared with simulated observed impacts",
        }
        for key, value in metrics.items()
    ]


def _metric_lookup(metrics: list[dict[str, Any]]):
    values = {}
    for row in metrics:
        try:
            values[(row["phase"], row["metric"])] = float(row["value"])
        except (TypeError, ValueError):
            values[(row["phase"], row["metric"])] = math.inf

    def lookup(phase: str, metric: str) -> float:
        return values.get((phase, metric), math.inf)

    return lookup


def _observed_delay_ms(scenario: Scenario, root_fault: str, effect: str) -> float:
    graph = build_propagation_graph(scenario)
    base_delay = _path_delay_ms(graph, root_fault, effect)
    observation_model = scenario.fault_propagation.get("observation_model", {})
    detection_delay = _effect_detection_delay_ms(effect, observation_model)
    if math.isfinite(base_delay):
        return base_delay * (1.0 + detection_delay / 1000.0)
    return detection_delay


def _path_delay_ms(graph: nx.DiGraph, root_fault: str, effect: str) -> float:
    if root_fault not in graph or effect not in graph:
        return math.inf
    try:
        path = min(nx.all_simple_paths(graph, root_fault, effect, cutoff=6), key=len)
    except (ValueError, nx.NetworkXNoPath):
        return math.inf
    return sum(float(graph.edges[source, target].get("delay_ms", 0.0)) for source, target in zip(path[:-1], path[1:]))


def _effect_detection_delay_ms(effect: str, observation_model: dict[str, Any]) -> float:
    if effect == "route_invalid":
        return float(observation_model.get("route_validation_delay_ms", 12.0))
    if effect in {"service_unreachable", "science_data_interruption"}:
        return float(observation_model.get("service_detection_delay_ms", 18.0))
    if effect in {"snr_degradation", "packet_loss_increase"}:
        return float(observation_model.get("physical_detection_delay_ms", 6.0))
    if effect in {"congestion_increase", "end_to_end_delay_increase"}:
        return float(observation_model.get("congestion_detection_delay_ms", 14.0))
    return float(observation_model.get("qos_detection_delay_ms", 24.0))
