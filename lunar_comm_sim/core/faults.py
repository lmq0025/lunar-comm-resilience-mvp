"""Fault mode library and injection logic."""

from __future__ import annotations

from dataclasses import asdict, dataclass

import networkx as nx

from lunar_comm_sim.core.environment import clamp
from lunar_comm_sim.core.scenario import FaultConfig, Scenario


FAULT_LIBRARY = {
    "radiation_cpu_lock": "F1 radiation-induced CPU lock",
    "single_event_upset": "F2 single event upset",
    "dust_antenna_degradation": "F3 antenna gain degradation from lunar dust",
    "thermal_rf_drift": "F4 RF drift under extreme thermal conditions",
    "terrain_obstruction": "F5 terrain obstruction",
    "main_hub_failure": "F6 primary hub failure",
    "relay_handover_delay": "F7 relay handover delay anomaly",
    "buffer_overflow": "F8 multi-service buffer overflow",
    "route_oscillation": "F9 route oscillation",
    "power_limited_mode": "F10 power-limited operation",
}


@dataclass(frozen=True)
class FaultEventRecord:
    fault_id: str
    fault_type: str
    target: str
    start_s: float
    duration_s: float
    severity: float
    applied_effect: str


def apply_faults(graph: nx.Graph, scenario: Scenario) -> tuple[nx.Graph, list[FaultEventRecord]]:
    """Apply configured MVP faults to a graph copy."""

    faulted = graph.copy()
    records: list[FaultEventRecord] = []

    for fault in scenario.faults:
        if fault.type not in scenario.faults_enabled:
            continue
        effect = _apply_single_fault(faulted, scenario, fault)
        records.append(
            FaultEventRecord(
                fault_id=fault.id,
                fault_type=fault.type,
                target=fault.target,
                start_s=fault.start_s,
                duration_s=fault.duration_s,
                severity=fault.severity,
                applied_effect=effect,
            )
        )

    faulted.graph["stage"] = "before_healing"
    return faulted, records


def fault_records_as_rows(records: list[FaultEventRecord]) -> list[dict[str, object]]:
    return [asdict(record) for record in records]


def _apply_single_fault(graph: nx.Graph, scenario: Scenario, fault: FaultConfig) -> str:
    if fault.type == "main_hub_failure":
        if fault.target in graph:
            graph.nodes[fault.target]["active"] = False
            graph.nodes[fault.target]["availability"] = 0.0
            for _, _, data in graph.edges(fault.target, data=True):
                data["active"] = False
                data["availability"] = 0.0
                data["packet_loss_rate"] = 1.0
        return "primary hub disabled; backup paths remain available for rerouting"

    if fault.type == "dust_antenna_degradation":
        for _, _, data in graph.edges(data=True):
            data["snr_db"] = data.get("snr_db", 0.0) - 1.5 * fault.severity
            data["antenna_gain_db"] = data.get("antenna_gain_db", 0.0) - 1.0 * fault.severity
            data["availability"] = clamp(data.get("availability", 1.0) - 0.0006 * fault.severity, 0.0, 1.0)
            data["packet_loss_rate"] = clamp(data.get("packet_loss_rate", 0.0) * (1.0 + fault.severity), 0.0, 0.35)
            data["bit_error_rate"] = data["packet_loss_rate"] / 10.0
        return "RF links degraded by dust severity"

    if fault.type == "relay_handover_delay":
        handover = scenario.environment.get("relay_handover", {})
        extra_delay = float(handover.get("handover_extra_delay_ms", 120))
        for _, _, data in graph.edges(data=True):
            if data.get("kind") in {"surface_to_orbit", "orbit_to_ground"}:
                data["delay_ms"] = data.get("delay_ms", 0.0) + extra_delay
                data["handover_disturbance_ms"] = extra_delay
        return f"relay handover disturbance set to {extra_delay:.1f} ms"

    if fault.type == "buffer_overflow":
        multiplier = 1.0 + 2.4 * fault.severity
        for _, _, data in graph.edges(data=True):
            data["congestion_multiplier"] = multiplier
        return f"congestion multiplier set to {multiplier:.2f}"

    if fault.type == "radiation_cpu_lock":
        if fault.target in graph:
            added_delay = 40.0 + 160.0 * fault.severity
            current = float(graph.nodes[fault.target].get("node_processing_delay_ms", 0.0))
            graph.nodes[fault.target]["node_processing_delay_ms"] = current + added_delay
            graph.nodes[fault.target]["cpu_fault"] = True
            return f"node processing delay increased by {added_delay:.1f} ms"
        return "radiation CPU lock target not found"

    return "fault registered without additional MVP degradation"
