"""API service layer for validation, sessions, and staged step dispatch."""

from __future__ import annotations

from typing import Any, Callable

from pydantic import ValidationError

from lunar_comm_sim.api.schemas import ScenarioPayload
from lunar_comm_sim.core.faults import FAULT_LIBRARY
from lunar_comm_sim.core.healing import HEALING_STRATEGIES
from lunar_comm_sim.core.scenario import load_scenario_from_dict
from lunar_comm_sim.sim import staged_engine as staged
from lunar_comm_sim.sim.staged_engine import StagedSimulationState


STEP_HANDLERS: dict[str, tuple[str, Callable[[StagedSimulationState], dict[str, Any]]]] = {
    "build-topology": (staged.STEP_TOPOLOGY_BUILT, staged.build_topology_step),
    "calculate-routes": (staged.STEP_NOMINAL_ROUTES, staged.calculate_routes_step),
    "run-nominal": (staged.STEP_NOMINAL_SIMULATED, staged.run_nominal_step),
    "inject-faults": (staged.STEP_FAULTS_INJECTED, staged.inject_faults_step),
    "analyze-fault-impact": (staged.STEP_FAULT_IMPACT, staged.analyze_fault_impact_step),
    "execute-healing": (staged.STEP_HEALING_EXECUTED, staged.execute_healing_step),
    "recalculate-routes": (staged.STEP_HEALED_ROUTES, staged.recalculate_routes_step),
    "run-after-healing": (staged.STEP_AFTER_HEALING, staged.run_after_healing_step),
    "verify-indicators": (staged.STEP_INDICATORS, staged.verify_indicators_step),
}


def validate_scenario_payload(raw: dict[str, Any]) -> dict[str, Any]:
    """Validate scenario JSON and return field-level errors and warnings."""

    errors: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []
    try:
        payload = ScenarioPayload.model_validate(raw)
    except ValidationError as exc:
        for error in exc.errors():
            errors.append(
                {
                    "field": ".".join(str(item) for item in error["loc"]),
                    "message": error["msg"],
                    "type": error["type"],
                }
            )
        payload = None
        _append_raw_service_semantic_errors(raw, errors)

    if payload is not None:
        node_ids: set[str] = set()
        for index, node in enumerate(payload.nodes):
            if node.id in node_ids:
                errors.append({"field": f"nodes.{index}.id", "message": f"duplicate node id: {node.id}"})
            node_ids.add(node.id)

        for index, link in enumerate(payload.links):
            if link.source not in node_ids:
                errors.append({"field": f"links.{index}.source", "message": f"unknown source node: {link.source}"})
            if link.target not in node_ids:
                errors.append({"field": f"links.{index}.target", "message": f"unknown target node: {link.target}"})

        service_ids: set[str] = set()
        for index, service in enumerate(payload.services):
            if service.id in service_ids:
                errors.append({"field": f"services.{index}.id", "message": f"duplicate service id: {service.id}"})
            service_ids.add(service.id)
            if service.source not in node_ids:
                errors.append({"field": f"services.{index}.source", "message": f"unknown source node: {service.source}"})
            if service.target not in node_ids:
                errors.append({"field": f"services.{index}.target", "message": f"unknown target node: {service.target}"})
            if service.source == service.target:
                errors.append({"field": f"services.{index}.target", "message": "source and target must be different"})
            if (
                service.degraded_bandwidth_mbps is not None
                and service.degraded_bandwidth_mbps > service.required_bandwidth_mbps
            ):
                errors.append(
                    {
                        "field": f"services.{index}.degraded_bandwidth_mbps",
                        "message": "degraded bandwidth must be <= required bandwidth",
                    }
                )

        for fault_type in payload.faults.enabled:
            if fault_type not in FAULT_LIBRARY:
                errors.append({"field": "faults.enabled", "message": f"unknown fault type: {fault_type}"})
        for index, fault in enumerate(payload.faults.schedule):
            if fault.type not in FAULT_LIBRARY:
                errors.append({"field": f"faults.schedule.{index}.type", "message": f"unknown fault type: {fault.type}"})
            elif fault.target not in node_ids:
                warnings.append(
                    {
                        "field": f"faults.schedule.{index}.target",
                        "message": f"target {fault.target} is not a node; treated as a special fault target if supported",
                    }
                )

        for strategy in payload.healing.enabled:
            if strategy not in HEALING_STRATEGIES:
                errors.append({"field": "healing.enabled", "message": f"unknown healing strategy: {strategy}"})

    if not errors:
        try:
            load_scenario_from_dict(raw)
        except Exception as exc:  # noqa: BLE001 - returned as validation detail, not traceback
            errors.append({"field": "scenario", "message": str(exc)})

    summary = {
        "node_count": len(raw.get("nodes", [])),
        "link_count": len(raw.get("links", [])),
        "service_count": len(raw.get("services", [])),
        "fault_count": len(raw.get("faults", {}).get("schedule", [])),
        "indicator_count": len(raw.get("technical_indicators", [])),
    }
    return {"valid": not errors, "errors": errors, "warnings": warnings, "summary": summary}


def _append_raw_service_semantic_errors(raw: dict[str, Any], errors: list[dict[str, Any]]) -> None:
    node_ids = {str(node.get("id")) for node in raw.get("nodes", []) if isinstance(node, dict) and node.get("id")}
    service_ids: set[str] = set()
    for index, service in enumerate(raw.get("services", [])):
        if not isinstance(service, dict):
            continue
        service_id = str(service.get("id", ""))
        source = str(service.get("source", ""))
        target = str(service.get("target", ""))
        if service_id in service_ids:
            errors.append({"field": f"services.{index}.id", "message": f"duplicate service id: {service_id}"})
        service_ids.add(service_id)
        if source and source not in node_ids:
            errors.append({"field": f"services.{index}.source", "message": f"unknown source node: {source}"})
        if target and target not in node_ids:
            errors.append({"field": f"services.{index}.target", "message": f"unknown target node: {target}"})
        if source and target and source == target:
            errors.append({"field": f"services.{index}.target", "message": "source and target must be different"})


def session_summary(state: StagedSimulationState) -> dict[str, Any]:
    """Return public session metadata."""

    return {
        "session_id": state.session_id,
        "scenario_name": state.scenario.name,
        "current_step": state.current_step,
        "completed_steps": list(state.completed_steps),
        "next_allowed_step": state.next_allowed_step(),
        "created_at": state.created_at.isoformat(),
        "updated_at": state.updated_at.isoformat(),
        "output_dir": state.output_dir.as_posix() if state.output_dir else None,
    }


def execute_step(state: StagedSimulationState, step_endpoint: str) -> dict[str, Any]:
    """Run one staged step and return the standard step response body."""

    completed_step, handler = STEP_HANDLERS[step_endpoint]
    result = handler(state)
    return {
        "session_id": state.session_id,
        "completed_step": completed_step,
        "current_step": state.current_step,
        "completed_steps": list(state.completed_steps),
        "next_allowed_step": state.next_allowed_step(),
        "step_result": result,
    }
