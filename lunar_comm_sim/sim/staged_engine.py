"""Stateful nine-step simulation engine for interactive backends."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

import networkx as nx

from lunar_comm_sim.core.faults import FaultEventRecord, apply_faults, fault_records_as_rows
from lunar_comm_sim.core.healing import (
    HealingActionRecord,
    apply_non_routing_healing,
    apply_reroute_healing,
    healing_actions_as_rows,
    initialize_healing_state,
)
from lunar_comm_sim.core.metrics import build_indicator_checks, calculate_metrics
from lunar_comm_sim.core.physical_models import physical_model_metrics_as_rows, validate_physical_models
from lunar_comm_sim.core.propagation import (
    calculate_propagation_metrics,
    compare_propagation_prediction,
    extract_observed_impacts,
    predict_fault_propagation,
    propagation_metrics_as_rows,
)
from lunar_comm_sim.core.reporting import write_csv, write_report
from lunar_comm_sim.core.routing import build_routing_table, service_routes_as_rows
from lunar_comm_sim.core.scenario import Scenario, load_scenario, load_scenario_from_dict
from lunar_comm_sim.core.services import ServiceResult, service_results_as_rows, simulate_services
from lunar_comm_sim.core.topology import build_topology, draw_topology
from lunar_comm_sim.sim.snapshots import graph_snapshot, graph_summary, metric_delta_rows, routes_snapshot


REQUIRED_OUTPUTS = [
    "metrics_summary.csv",
    "indicator_check.csv",
    "fault_events.csv",
    "healing_actions.csv",
    "service_results.csv",
    "service_routes.csv",
    "fault_propagation_predictions.csv",
    "observed_impacts.csv",
    "fault_propagation_comparison.csv",
    "fault_propagation_metrics.csv",
    "physical_model_validation.csv",
    "physical_model_metrics.csv",
    "topology_nominal.png",
    "topology_before.png",
    "topology_after.png",
    "report.md",
]

ARTIFACT_DESCRIPTIONS = {
    "metrics_summary.csv": ("csv", "三阶段指标汇总"),
    "indicator_check.csv": ("csv", "技术指标验证结果"),
    "fault_events.csv": ("csv", "故障事件记录"),
    "healing_actions.csv": ("csv", "自愈动作记录"),
    "service_results.csv": ("csv", "三阶段业务结果"),
    "service_routes.csv": ("csv", "三阶段业务路径"),
    "fault_propagation_predictions.csv": ("csv", "故障传播预测"),
    "observed_impacts.csv": ("csv", "故障实际影响"),
    "fault_propagation_comparison.csv": ("csv", "预测与观测对比"),
    "fault_propagation_metrics.csv": ("csv", "传播模型指标"),
    "physical_model_validation.csv": ("csv", "物理模型验证明细"),
    "physical_model_metrics.csv": ("csv", "物理模型指标"),
    "topology_nominal.png": ("png", "正常拓扑图"),
    "topology_before.png": ("png", "故障后拓扑图"),
    "topology_after.png": ("png", "自愈后拓扑图"),
    "report.md": ("markdown", "完整仿真报告"),
}

STEP_CREATED = "created"
STEP_TOPOLOGY_BUILT = "topology_built"
STEP_NOMINAL_ROUTES = "nominal_routes_calculated"
STEP_NOMINAL_SIMULATED = "nominal_simulated"
STEP_FAULTS_INJECTED = "faults_injected"
STEP_FAULT_IMPACT = "fault_impact_analyzed"
STEP_HEALING_EXECUTED = "healing_executed"
STEP_HEALED_ROUTES = "healed_routes_calculated"
STEP_AFTER_HEALING = "after_healing_simulated"
STEP_INDICATORS = "indicators_verified"

STEP_SEQUENCE = [
    STEP_TOPOLOGY_BUILT,
    STEP_NOMINAL_ROUTES,
    STEP_NOMINAL_SIMULATED,
    STEP_FAULTS_INJECTED,
    STEP_FAULT_IMPACT,
    STEP_HEALING_EXECUTED,
    STEP_HEALED_ROUTES,
    STEP_AFTER_HEALING,
    STEP_INDICATORS,
]

STEP_ENDPOINTS = {
    STEP_TOPOLOGY_BUILT: "build-topology",
    STEP_NOMINAL_ROUTES: "calculate-routes",
    STEP_NOMINAL_SIMULATED: "run-nominal",
    STEP_FAULTS_INJECTED: "inject-faults",
    STEP_FAULT_IMPACT: "analyze-fault-impact",
    STEP_HEALING_EXECUTED: "execute-healing",
    STEP_HEALED_ROUTES: "recalculate-routes",
    STEP_AFTER_HEALING: "run-after-healing",
    STEP_INDICATORS: "verify-indicators",
}

REQUIRED_CURRENT_STEP = {
    STEP_TOPOLOGY_BUILT: STEP_CREATED,
    STEP_NOMINAL_ROUTES: STEP_TOPOLOGY_BUILT,
    STEP_NOMINAL_SIMULATED: STEP_NOMINAL_ROUTES,
    STEP_FAULTS_INJECTED: STEP_NOMINAL_SIMULATED,
    STEP_FAULT_IMPACT: STEP_FAULTS_INJECTED,
    STEP_HEALING_EXECUTED: STEP_FAULT_IMPACT,
    STEP_HEALED_ROUTES: STEP_HEALING_EXECUTED,
    STEP_AFTER_HEALING: STEP_HEALED_ROUTES,
    STEP_INDICATORS: STEP_AFTER_HEALING,
}


class InvalidStepOrderError(RuntimeError):
    """Raised when a staged simulation step is called out of order."""

    def __init__(self, current_step: str, required_step: str) -> None:
        self.current_step = current_step
        self.required_step = required_step
        super().__init__("当前步骤不允许执行该操作")


@dataclass
class StagedSimulationState:
    """In-memory state for one interactive simulation session."""

    scenario: Scenario
    session_id: str = field(default_factory=lambda: str(uuid4()))
    output_dir: Path | None = None
    current_step: str = STEP_CREATED
    completed_steps: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    nominal_graph: nx.Graph | None = None
    faulted_graph: nx.Graph | None = None
    healed_graph: nx.Graph | None = None

    nominal_services: list[ServiceResult] = field(default_factory=list)
    before_healing_services: list[ServiceResult] = field(default_factory=list)
    after_healing_services: list[ServiceResult] = field(default_factory=list)

    nominal_metrics: list[dict[str, Any]] = field(default_factory=list)
    before_healing_metrics: list[dict[str, Any]] = field(default_factory=list)
    after_healing_metrics: list[dict[str, Any]] = field(default_factory=list)

    fault_records: list[FaultEventRecord] = field(default_factory=list)
    healing_actions: list[HealingActionRecord] = field(default_factory=list)

    propagation_predictions: list[dict[str, Any]] = field(default_factory=list)
    observed_impacts: list[dict[str, Any]] = field(default_factory=list)
    propagation_comparison: list[dict[str, Any]] = field(default_factory=list)
    propagation_metrics: dict[str, Any] = field(default_factory=dict)

    physical_model_validation: list[dict[str, Any]] = field(default_factory=list)
    physical_model_metrics: dict[str, Any] = field(default_factory=dict)
    indicators: list[dict[str, Any]] = field(default_factory=list)

    def next_allowed_step(self) -> str | None:
        if self.current_step == STEP_INDICATORS:
            return None
        for step in STEP_SEQUENCE:
            if step not in self.completed_steps:
                return STEP_ENDPOINTS[step]
        return None


def coerce_scenario(scenario_input: str | Path | dict[str, Any] | Scenario) -> Scenario:
    """Load a scenario from a path, dictionary, or existing Scenario object."""

    if isinstance(scenario_input, Scenario):
        return scenario_input
    if isinstance(scenario_input, dict):
        return load_scenario_from_dict(scenario_input)
    return load_scenario(scenario_input)


def create_staged_state(
    scenario_input: str | Path | dict[str, Any] | Scenario,
    output_dir: str | Path | None = None,
    session_id: str | None = None,
) -> StagedSimulationState:
    """Create a staged simulation state for interactive execution."""

    scenario = coerce_scenario(scenario_input)
    state = StagedSimulationState(scenario=scenario, session_id=session_id or str(uuid4()))
    if output_dir is None:
        state.output_dir = scenario.project_root / "outputs" / "api_sessions" / state.session_id
    else:
        state.output_dir = Path(output_dir)
    return state


def build_topology_step(state: StagedSimulationState) -> dict[str, Any]:
    """Step 1: build the nominal topology."""

    _ensure_step(state, STEP_TOPOLOGY_BUILT)
    graph = build_topology(state.scenario)
    graph.graph["stage"] = "nominal"
    state.nominal_graph = graph
    _mark_completed(state, STEP_TOPOLOGY_BUILT)
    return {"topology": graph_snapshot(graph, state.scenario, "nominal")}


def calculate_routes_step(state: StagedSimulationState) -> dict[str, Any]:
    """Step 2: compute nominal routes over the nominal topology."""

    _ensure_step(state, STEP_NOMINAL_ROUTES)
    graph = _require_graph(state.nominal_graph, "nominal_graph")
    graph.graph["service_routes"] = build_routing_table(
        graph,
        state.scenario,
        recompute=True,
        route_source="nominal_computed",
    )
    _mark_completed(state, STEP_NOMINAL_ROUTES)
    return {"routes": routes_snapshot(graph, state.scenario), "topology": graph_snapshot(graph, state.scenario, "nominal")}


def run_nominal_step(state: StagedSimulationState) -> dict[str, Any]:
    """Step 3: validate physical models and simulate nominal services."""

    _ensure_step(state, STEP_NOMINAL_SIMULATED)
    graph = _require_graph(state.nominal_graph, "nominal_graph")
    state.physical_model_metrics, state.physical_model_validation = validate_physical_models(state.scenario)
    state.nominal_services = simulate_services(graph, state.scenario, phase="nominal")
    state.nominal_metrics = calculate_metrics(
        graph,
        state.scenario,
        state.nominal_services,
        phase="nominal",
        physical_model_metrics=state.physical_model_metrics,
    )
    _mark_completed(state, STEP_NOMINAL_SIMULATED)
    return {
        "services": service_results_as_rows(state.nominal_services),
        "metrics": state.nominal_metrics,
        "topology": graph_snapshot(graph, state.scenario, "nominal"),
        "routes": routes_snapshot(graph, state.scenario),
        "physical_model_validation": state.physical_model_validation,
        "physical_model_metrics": state.physical_model_metrics,
    }


def inject_faults_step(state: StagedSimulationState) -> dict[str, Any]:
    """Step 4: apply enabled faults and validate inherited nominal routes."""

    _ensure_step(state, STEP_FAULTS_INJECTED)
    nominal_graph = _require_graph(state.nominal_graph, "nominal_graph")
    faulted_graph, state.fault_records = apply_faults(nominal_graph, state.scenario)
    faulted_graph.graph["service_routes"] = build_routing_table(
        faulted_graph,
        state.scenario,
        recompute=False,
        inherited_routes=nominal_graph.graph["service_routes"],
        route_source="inherited_nominal",
    )
    state.faulted_graph = faulted_graph
    _mark_completed(state, STEP_FAULTS_INJECTED)
    return {
        "fault_records": fault_records_as_rows(state.fault_records),
        "routes": routes_snapshot(faulted_graph, state.scenario),
        "topology": graph_snapshot(faulted_graph, state.scenario, "before_healing"),
    }


def analyze_fault_impact_step(state: StagedSimulationState) -> dict[str, Any]:
    """Step 5: simulate before-healing services and analyze fault propagation."""

    _ensure_step(state, STEP_FAULT_IMPACT)
    faulted_graph = _require_graph(state.faulted_graph, "faulted_graph")
    state.before_healing_services = simulate_services(faulted_graph, state.scenario, phase="before_healing")
    state.before_healing_metrics = calculate_metrics(
        faulted_graph,
        state.scenario,
        state.before_healing_services,
        phase="before_healing",
        physical_model_metrics=state.physical_model_metrics,
    )
    service_route_rows = _service_route_rows_until_before(state)
    preliminary_metrics = state.nominal_metrics + state.before_healing_metrics
    state.propagation_predictions = predict_fault_propagation(state.fault_records, state.scenario)
    state.observed_impacts = extract_observed_impacts(
        state.fault_records,
        state.nominal_services + state.before_healing_services,
        preliminary_metrics,
        service_route_rows,
        state.scenario,
    )
    state.propagation_comparison = compare_propagation_prediction(
        state.propagation_predictions,
        state.observed_impacts,
    )
    state.propagation_metrics = (
        calculate_propagation_metrics(state.propagation_comparison)
        if state.scenario.fault_propagation.get("enabled", False)
        else {}
    )
    impact_summary = _fault_impact_summary(state)
    _mark_completed(state, STEP_FAULT_IMPACT)
    return {
        "services": service_results_as_rows(state.before_healing_services),
        "metrics": state.before_healing_metrics,
        "fault_impact": impact_summary,
    }


def execute_healing_step(state: StagedSimulationState) -> dict[str, Any]:
    """Step 6: execute non-routing healing actions only."""

    _ensure_step(state, STEP_HEALING_EXECUTED)
    faulted_graph = _require_graph(state.faulted_graph, "faulted_graph")
    healed_graph = initialize_healing_state(faulted_graph, state.scenario)
    state.healing_actions = apply_non_routing_healing(healed_graph, state.scenario)
    state.healed_graph = healed_graph
    _mark_completed(state, STEP_HEALING_EXECUTED)
    return {
        "healing_actions": healing_actions_as_rows(state.healing_actions),
        "pending_route_recalculation": bool(healed_graph.graph.get("pending_route_recalculation", False)),
        "routes": routes_snapshot(healed_graph, state.scenario),
        "topology": graph_snapshot(healed_graph, state.scenario, "after_healing"),
    }


def recalculate_routes_step(state: StagedSimulationState) -> dict[str, Any]:
    """Step 7: recompute or revalidate routes after healing actions."""

    _ensure_step(state, STEP_HEALED_ROUTES)
    healed_graph = _require_graph(state.healed_graph, "healed_graph")
    state.healing_actions.extend(apply_reroute_healing(healed_graph, state.scenario))
    _mark_completed(state, STEP_HEALED_ROUTES)
    return {
        "healing_actions": healing_actions_as_rows(state.healing_actions),
        "pending_route_recalculation": bool(healed_graph.graph.get("pending_route_recalculation", False)),
        "routes": routes_snapshot(healed_graph, state.scenario),
        "topology": graph_snapshot(healed_graph, state.scenario, "after_healing"),
    }


def run_after_healing_step(state: StagedSimulationState) -> dict[str, Any]:
    """Step 8: simulate after-healing services and metrics."""

    _ensure_step(state, STEP_AFTER_HEALING)
    healed_graph = _require_graph(state.healed_graph, "healed_graph")
    state.after_healing_services = simulate_services(healed_graph, state.scenario, phase="after_healing")
    state.after_healing_metrics = calculate_metrics(
        healed_graph,
        state.scenario,
        state.after_healing_services,
        phase="after_healing",
        propagation_metrics=state.propagation_metrics,
        physical_model_metrics=state.physical_model_metrics,
    )
    _mark_completed(state, STEP_AFTER_HEALING)
    return {
        "services": service_results_as_rows(state.after_healing_services),
        "metrics": state.after_healing_metrics,
        "topology": graph_snapshot(healed_graph, state.scenario, "after_healing"),
        "healing_actions": healing_actions_as_rows(state.healing_actions),
        "routes": routes_snapshot(healed_graph, state.scenario),
    }


def verify_indicators_step(state: StagedSimulationState, write_artifacts: bool = True) -> dict[str, Any]:
    """Step 9: verify technical indicators and optionally write artifacts."""

    _ensure_step(state, STEP_INDICATORS)
    state.indicators = build_indicator_checks(state.after_healing_metrics, state.scenario)
    if write_artifacts:
        write_final_artifacts(state)
    applicable = [row for row in state.indicators if row.get("applicable")]
    passed = [row for row in applicable if row.get("passed")]
    failed = [row for row in applicable if not row.get("passed")]
    _mark_completed(state, STEP_INDICATORS)
    return {
        "indicators": state.indicators,
        "applicable_count": len(applicable),
        "passed_count": len(passed),
        "failed_count": len(failed),
        "not_applicable_count": len(state.indicators) - len(applicable),
        "artifacts": artifact_manifest(state),
    }


def run_all_steps(
    scenario_input: str | Path | dict[str, Any] | Scenario,
    output_dir: str | Path,
    write_artifacts: bool = True,
) -> StagedSimulationState:
    """Run all nine staged steps and return the final state."""

    state = create_staged_state(scenario_input, output_dir=output_dir)
    build_topology_step(state)
    calculate_routes_step(state)
    run_nominal_step(state)
    inject_faults_step(state)
    analyze_fault_impact_step(state)
    execute_healing_step(state)
    recalculate_routes_step(state)
    run_after_healing_step(state)
    verify_indicators_step(state, write_artifacts=write_artifacts)
    return state


def simulation_result(state: StagedSimulationState) -> dict[str, Any]:
    """Return the legacy run_simulation result dictionary for a staged state."""

    nominal_graph = _require_graph(state.nominal_graph, "nominal_graph")
    faulted_graph = _require_graph(state.faulted_graph, "faulted_graph")
    healed_graph = _require_graph(state.healed_graph, "healed_graph")
    all_metrics = state.nominal_metrics + state.before_healing_metrics + state.after_healing_metrics
    return {
        "scenario": state.scenario,
        "output_dir": state.output_dir,
        "metrics": all_metrics,
        "indicators": state.indicators,
        "faults": state.fault_records,
        "healing_actions": state.healing_actions,
        "services": state.nominal_services + state.before_healing_services + state.after_healing_services,
        "routes": {
            "nominal": nominal_graph.graph.get("service_routes", {}),
            "before_healing": faulted_graph.graph.get("service_routes", {}),
            "after_healing": healed_graph.graph.get("service_routes", {}),
        },
        "propagation_predictions": state.propagation_predictions,
        "observed_impacts": state.observed_impacts,
        "propagation_comparison": state.propagation_comparison,
        "propagation_metrics": state.propagation_metrics,
        "physical_model_validation": state.physical_model_validation,
        "physical_model_metrics": state.physical_model_metrics,
        "required_outputs": [Path(state.output_dir) / name for name in REQUIRED_OUTPUTS],
    }


def snapshot_for_stage(state: StagedSimulationState, stage: str) -> dict[str, Any]:
    """Return a graph snapshot for a completed phase."""

    if stage == "nominal" and state.nominal_graph is not None and STEP_NOMINAL_SIMULATED in state.completed_steps:
        return graph_snapshot(state.nominal_graph, state.scenario, "nominal")
    if stage == "before_healing" and state.faulted_graph is not None and STEP_FAULT_IMPACT in state.completed_steps:
        return graph_snapshot(state.faulted_graph, state.scenario, "before_healing")
    if stage == "after_healing" and state.healed_graph is not None and STEP_AFTER_HEALING in state.completed_steps:
        return graph_snapshot(state.healed_graph, state.scenario, "after_healing")
    raise InvalidStepOrderError(state.current_step, f"{stage}_completed")


def artifact_manifest(state: StagedSimulationState) -> list[dict[str, Any]]:
    """Return required output file metadata for a session."""

    output_dir = Path(state.output_dir) if state.output_dir is not None else Path()
    rows = []
    for name in REQUIRED_OUTPUTS:
        path = output_dir / name
        rows.append(
            {
                "filename": name,
                "relative_path": path.as_posix(),
                "exists": path.exists(),
                "size_bytes": path.stat().st_size if path.exists() else 0,
                "file_type": ARTIFACT_DESCRIPTIONS.get(name, ("file", ""))[0],
                "purpose_zh": ARTIFACT_DESCRIPTIONS.get(name, ("file", ""))[1],
            }
        )
    return rows


def write_final_artifacts(state: StagedSimulationState) -> None:
    """Write CSV, PNG, and Markdown artifacts for a completed staged run."""

    output_dir = Path(state.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    nominal_graph = _require_graph(state.nominal_graph, "nominal_graph")
    faulted_graph = _require_graph(state.faulted_graph, "faulted_graph")
    healed_graph = _require_graph(state.healed_graph, "healed_graph")
    all_metrics = state.nominal_metrics + state.before_healing_metrics + state.after_healing_metrics
    fault_rows = fault_records_as_rows(state.fault_records)
    healing_rows = healing_actions_as_rows(state.healing_actions)
    service_route_rows = _all_service_route_rows(state)

    draw_topology(nominal_graph, output_dir / "topology_nominal.png", "正常状态网络拓扑")
    draw_topology(faulted_graph, output_dir / "topology_before.png", "故障后、自愈前网络拓扑")
    draw_topology(healed_graph, output_dir / "topology_after.png", "自愈后网络拓扑")

    write_csv(output_dir / "metrics_summary.csv", all_metrics)
    write_csv(output_dir / "indicator_check.csv", state.indicators)
    write_csv(output_dir / "fault_events.csv", fault_rows)
    write_csv(output_dir / "healing_actions.csv", healing_rows)
    write_csv(output_dir / "service_results.csv", service_results_as_rows(state.nominal_services + state.before_healing_services + state.after_healing_services))
    write_csv(output_dir / "service_routes.csv", service_route_rows)
    write_csv(output_dir / "fault_propagation_predictions.csv", state.propagation_predictions)
    write_csv(output_dir / "observed_impacts.csv", state.observed_impacts)
    write_csv(output_dir / "fault_propagation_comparison.csv", state.propagation_comparison)
    write_csv(output_dir / "fault_propagation_metrics.csv", propagation_metrics_as_rows(state.propagation_metrics))
    write_csv(output_dir / "physical_model_validation.csv", state.physical_model_validation)
    write_csv(output_dir / "physical_model_metrics.csv", physical_model_metrics_as_rows(state.physical_model_metrics))
    write_report(
        output_dir / "report.md",
        state.scenario,
        all_metrics,
        state.indicators,
        REQUIRED_OUTPUTS,
        fault_rows=fault_rows,
        healing_rows=healing_rows,
        service_route_rows=service_route_rows,
        propagation_predictions=state.propagation_predictions,
        observed_impacts=state.observed_impacts,
        propagation_comparison=state.propagation_comparison,
        propagation_metrics=state.propagation_metrics,
        physical_model_validation_rows=state.physical_model_validation,
        physical_model_metrics=state.physical_model_metrics,
    )


def _ensure_step(state: StagedSimulationState, target_step: str) -> None:
    required = REQUIRED_CURRENT_STEP[target_step]
    if state.current_step != required:
        raise InvalidStepOrderError(state.current_step, required)


def _mark_completed(state: StagedSimulationState, step: str) -> None:
    state.current_step = step
    if step not in state.completed_steps:
        state.completed_steps.append(step)
    state.updated_at = datetime.now(timezone.utc)


def _require_graph(graph: nx.Graph | None, name: str) -> nx.Graph:
    if graph is None:
        raise RuntimeError(f"{name} is not initialized")
    return graph


def _all_service_route_rows(state: StagedSimulationState) -> list[dict[str, object]]:
    return (
        service_routes_as_rows(_require_graph(state.nominal_graph, "nominal_graph"), state.scenario, "nominal")
        + service_routes_as_rows(_require_graph(state.faulted_graph, "faulted_graph"), state.scenario, "before_healing")
        + service_routes_as_rows(_require_graph(state.healed_graph, "healed_graph"), state.scenario, "after_healing")
    )


def _service_route_rows_until_before(state: StagedSimulationState) -> list[dict[str, object]]:
    return (
        service_routes_as_rows(_require_graph(state.nominal_graph, "nominal_graph"), state.scenario, "nominal")
        + service_routes_as_rows(_require_graph(state.faulted_graph, "faulted_graph"), state.scenario, "before_healing")
    )


def _fault_impact_summary(state: StagedSimulationState) -> dict[str, Any]:
    faulted_graph = _require_graph(state.faulted_graph, "faulted_graph")
    failed_nodes = [node for node, data in faulted_graph.nodes(data=True) if not data.get("active", True)]
    failed_links = [
        data.get("id")
        for _, _, data in faulted_graph.edges(data=True)
        if not data.get("active", True) or float(data.get("availability", 0.0)) <= 0.0
    ]
    degraded_links = [
        data.get("id")
        for _, _, data in faulted_graph.edges(data=True)
        if data.get("active", True)
        and (
            float(data.get("availability", 1.0)) < float(data.get("base_availability", 1.0))
            or float(data.get("packet_loss_rate", 0.0)) > float(data.get("base_packet_loss_rate", 0.0))
            or float(data.get("delay_ms", 0.0)) > float(data.get("base_delay_ms", 0.0))
        )
    ]
    routes = routes_snapshot(faulted_graph, state.scenario)
    invalid_services = [service_id for service_id, route in routes.items() if not route["valid"]]
    unreachable_services = [
        result.service_id
        for result in state.before_healing_services
        if not result.reachable or not result.route_valid
    ]
    nominal_success = {result.service_id: result.success_rate for result in state.nominal_services}
    qos_degraded = [
        result.service_id
        for result in state.before_healing_services
        if result.success_rate < nominal_success.get(result.service_id, 0.0)
    ]
    return {
        "affected_node_ids": failed_nodes,
        "failed_link_ids": failed_links,
        "degraded_link_ids": degraded_links,
        "invalid_service_ids": invalid_services,
        "unreachable_service_ids": unreachable_services,
        "qos_degraded_service_ids": qos_degraded,
        "metric_deltas": metric_delta_rows(state.nominal_metrics, state.before_healing_metrics),
        "propagation_predictions": state.propagation_predictions,
        "observed_impacts": state.observed_impacts,
        "propagation_comparison": state.propagation_comparison,
        "propagation_metrics": state.propagation_metrics,
        "summary": graph_summary(faulted_graph),
    }
