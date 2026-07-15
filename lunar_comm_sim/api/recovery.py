"""Recovery helpers for persisted simulation runs."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from lunar_comm_sim.api.schemas import (
    AnalyzeFaultImpactStepResponse,
    BuildTopologyStepResponse,
    CalculateRoutesStepResponse,
    ExecuteHealingStepResponse,
    InjectFaultsStepResponse,
    RecalculateRoutesStepResponse,
    RunAfterHealingStepResponse,
    RunNominalStepResponse,
    VerifyIndicatorsStepResponse,
)
from lunar_comm_sim.api.serializers import json_safe
from lunar_comm_sim.api.session_store import SimulationSessionStore
from lunar_comm_sim.api.step_service import STEP_HANDLERS, execute_step, session_summary
from lunar_comm_sim.persistence.models import SimulationRun
from lunar_comm_sim.persistence.services import json_loads, persist_step_response, update_run_from_state
from lunar_comm_sim.sim.staged_engine import STEP_ENDPOINTS, STEP_SEQUENCE, create_staged_state


STEP_RESPONSE_MODELS = {
    "topology_built": BuildTopologyStepResponse,
    "nominal_routes_calculated": CalculateRoutesStepResponse,
    "nominal_simulated": RunNominalStepResponse,
    "faults_injected": InjectFaultsStepResponse,
    "fault_impact_analyzed": AnalyzeFaultImpactStepResponse,
    "healing_executed": ExecuteHealingStepResponse,
    "healed_routes_calculated": RecalculateRoutesStepResponse,
    "after_healing_simulated": RunAfterHealingStepResponse,
    "indicators_verified": VerifyIndicatorsStepResponse,
}


def recover_run_session(store: SimulationSessionStore, db: Session, run: SimulationRun) -> dict[str, Any]:
    """Replay deterministic completed steps into a fresh in-memory session."""

    scenario = json_loads(run.scenario_json, {})
    output_dir = Path(run.output_dir) if run.output_dir else None
    state = create_staged_state(scenario, output_dir=output_dir, session_id=run.session_id)
    stored_completed = json_loads(run.completed_steps_json, [])
    for step_name in STEP_SEQUENCE:
        if step_name not in stored_completed:
            break
        endpoint = STEP_ENDPOINTS[step_name]
        response = execute_step(state, endpoint)
        safe_response = json_safe(response)
        model = STEP_RESPONSE_MODELS[step_name]
        validated = model.model_validate(safe_response).model_dump(mode="json")
        persist_step_response(db, run, step_name=step_name, response=validated, state=state)
    update_run_from_state(db, run, state)
    store.register(state)
    return session_summary(state)


def step_name_from_endpoint(endpoint: str) -> str:
    return STEP_HANDLERS[endpoint][0]
