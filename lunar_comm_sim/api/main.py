"""FastAPI application for the staged lunar communication simulator."""

from __future__ import annotations

import os
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from lunar_comm_sim.api.schemas import (
    AnalyzeFaultImpactStepResponse,
    ArtifactManifestResponse,
    BuildTopologyStepResponse,
    CalculateRoutesStepResponse,
    CatalogResponse,
    DeleteSessionResponse,
    ErrorResponse,
    GraphSnapshotResponse,
    HealthResponse,
    InjectFaultsStepResponse,
    RunNominalStepResponse,
    ScenarioPayload,
    ScenarioValidationResponse,
    SessionCreateRequest,
    SessionSummaryResponse,
    StepResponse,
)
from lunar_comm_sim.api.serializers import json_safe
from lunar_comm_sim.api.session_store import SessionNotFoundError, SimulationSessionStore
from lunar_comm_sim.api.step_service import execute_step, session_summary, validate_scenario_payload
from lunar_comm_sim.core.faults import FAULT_LIBRARY
from lunar_comm_sim.core.healing import HEALING_STRATEGIES
from lunar_comm_sim.sim.staged_engine import InvalidStepOrderError, artifact_manifest, snapshot_for_stage


app = FastAPI(
    title="Lunar Communication Resilience Platform API",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        f"http://localhost:{os.environ.get('LUNAR_FRONTEND_PORT', '5173')}",
        f"http://127.0.0.1:{os.environ.get('LUNAR_FRONTEND_PORT', '5173')}",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

store = SimulationSessionStore()


@app.exception_handler(InvalidStepOrderError)
async def invalid_step_order_handler(_request, exc: InvalidStepOrderError) -> JSONResponse:
    return _safe_response(
        ErrorResponse,
        {
            "error": {
                "code": "INVALID_STEP_ORDER",
                "message": "current step does not allow this operation",
                "current_step": exc.current_step,
                "required_step": exc.required_step,
            }
        },
        status_code=409,
    )


@app.exception_handler(SessionNotFoundError)
async def session_not_found_handler(_request, _exc: SessionNotFoundError) -> JSONResponse:
    return _safe_response(
        ErrorResponse,
        {"error": {"code": "SESSION_NOT_FOUND", "message": "session not found"}},
        status_code=404,
    )


@app.get("/api/v1/health", response_model=HealthResponse)
def health() -> JSONResponse:
    return _safe_response(
        HealthResponse,
        {
            "status": "ok",
            "application": "lunar-communication-resilience-platform",
            "version": "0.2.0",
        },
    )


@app.get("/api/v1/catalogs", response_model=CatalogResponse)
def catalogs() -> JSONResponse:
    return _safe_response(CatalogResponse, _catalog_payload())


@app.post("/api/v1/scenarios/validate", response_model=ScenarioValidationResponse)
def validate_scenario(raw: ScenarioPayload) -> JSONResponse:
    return _safe_response(ScenarioValidationResponse, validate_scenario_payload(raw.model_dump(mode="python")))


@app.post("/api/v1/sessions", response_model=SessionSummaryResponse)
def create_session(request: SessionCreateRequest) -> JSONResponse:
    scenario = request.scenario.model_dump(mode="python")
    validation = validate_scenario_payload(scenario)
    if not validation["valid"]:
        return _safe_response(ScenarioValidationResponse, validation, status_code=422)
    state = store.create(scenario)
    return _safe_response(SessionSummaryResponse, session_summary(state))


@app.get("/api/v1/sessions/{session_id}", response_model=SessionSummaryResponse)
def get_session(session_id: str) -> JSONResponse:
    with store.locked_session(session_id) as state:
        return _safe_response(SessionSummaryResponse, session_summary(state))


@app.delete("/api/v1/sessions/{session_id}", response_model=DeleteSessionResponse)
def delete_session(session_id: str) -> JSONResponse:
    store.delete(session_id)
    return _safe_response(DeleteSessionResponse, {"deleted": True, "session_id": session_id})


@app.post("/api/v1/sessions/{session_id}/steps/build-topology", response_model=BuildTopologyStepResponse)
def build_topology(session_id: str) -> JSONResponse:
    return _execute_locked_step(session_id, "build-topology", BuildTopologyStepResponse)


@app.post("/api/v1/sessions/{session_id}/steps/calculate-routes", response_model=CalculateRoutesStepResponse)
def calculate_routes(session_id: str) -> JSONResponse:
    return _execute_locked_step(session_id, "calculate-routes", CalculateRoutesStepResponse)


@app.post("/api/v1/sessions/{session_id}/steps/run-nominal", response_model=RunNominalStepResponse)
def run_nominal(session_id: str) -> JSONResponse:
    return _execute_locked_step(session_id, "run-nominal", RunNominalStepResponse)


@app.post("/api/v1/sessions/{session_id}/steps/inject-faults", response_model=InjectFaultsStepResponse)
def inject_faults(session_id: str) -> JSONResponse:
    return _execute_locked_step(session_id, "inject-faults", InjectFaultsStepResponse)


@app.post("/api/v1/sessions/{session_id}/steps/analyze-fault-impact", response_model=AnalyzeFaultImpactStepResponse)
def analyze_fault_impact(session_id: str) -> JSONResponse:
    return _execute_locked_step(session_id, "analyze-fault-impact", AnalyzeFaultImpactStepResponse)


@app.post("/api/v1/sessions/{session_id}/steps/execute-healing", response_model=StepResponse)
def execute_healing(session_id: str) -> JSONResponse:
    return _execute_locked_step(session_id, "execute-healing")


@app.post("/api/v1/sessions/{session_id}/steps/recalculate-routes", response_model=StepResponse)
def recalculate_routes(session_id: str) -> JSONResponse:
    return _execute_locked_step(session_id, "recalculate-routes")


@app.post("/api/v1/sessions/{session_id}/steps/run-after-healing", response_model=StepResponse)
def run_after_healing(session_id: str) -> JSONResponse:
    return _execute_locked_step(session_id, "run-after-healing")


@app.post("/api/v1/sessions/{session_id}/steps/verify-indicators", response_model=StepResponse)
def verify_indicators(session_id: str) -> JSONResponse:
    return _execute_locked_step(session_id, "verify-indicators")


@app.get("/api/v1/sessions/{session_id}/snapshots/{stage}", response_model=GraphSnapshotResponse)
def get_snapshot(session_id: str, stage: str) -> JSONResponse:
    if stage not in {"nominal", "before_healing", "after_healing"}:
        raise HTTPException(status_code=404, detail="unknown snapshot stage")
    with store.locked_session(session_id) as state:
        return _safe_response(GraphSnapshotResponse, snapshot_for_stage(state, stage))


@app.get("/api/v1/sessions/{session_id}/artifacts", response_model=ArtifactManifestResponse)
def get_artifacts(session_id: str) -> JSONResponse:
    with store.locked_session(session_id) as state:
        return _safe_response(ArtifactManifestResponse, {"artifacts": artifact_manifest(state)})


def _execute_locked_step(
    session_id: str,
    step_endpoint: str,
    response_model: type[BaseModel] = StepResponse,
) -> JSONResponse:
    with store.locked_session(session_id) as state:
        return _safe_response(response_model, execute_step(state, step_endpoint))


def _safe_response(model: type[BaseModel], content: Any, status_code: int = 200) -> JSONResponse:
    safe_content = json_safe(content)
    validated = model.model_validate(safe_content)
    return JSONResponse(status_code=status_code, content=validated.model_dump(mode="json"))


def _catalog_payload() -> dict[str, Any]:
    return {
        "node_types": [
            {"id": "main_hub", "name_en": "Main hub"},
            {"id": "surface_relay", "name_en": "Surface relay"},
            {"id": "rover", "name_en": "Rover"},
            {"id": "compute", "name_en": "Edge compute"},
            {"id": "payload", "name_en": "Payload"},
            {"id": "terminal", "name_en": "Terminal"},
            {"id": "orbiter", "name_en": "Orbiter"},
            {"id": "ground", "name_en": "Ground station"},
        ],
        "link_types": [
            {"id": "local", "name_en": "Local"},
            {"id": "redundant_surface", "name_en": "Redundant surface"},
            {"id": "surface_to_orbit", "name_en": "Surface to orbit"},
            {"id": "orbit_to_ground", "name_en": "Orbit to ground"},
        ],
        "fault_modes": [_fault_catalog_item(key, value) for key, value in FAULT_LIBRARY.items()],
        "healing_strategies": [{"id": key, "description": value} for key, value in HEALING_STRATEGIES.items()],
        "routing_strategies": [
            {
                "id": "shortest_delay",
                "description": "Use delay_ms as the shortest-path weight.",
            }
        ],
        "simulation_steps": [
            {"id": "build-topology", "name_en": "Build topology"},
            {"id": "calculate-routes", "name_en": "Calculate routes"},
            {"id": "run-nominal", "name_en": "Run nominal state"},
            {"id": "inject-faults", "name_en": "Inject faults"},
            {"id": "analyze-fault-impact", "name_en": "Analyze fault impact"},
            {"id": "execute-healing", "name_en": "Execute healing"},
            {"id": "recalculate-routes", "name_en": "Recalculate routes"},
            {"id": "run-after-healing", "name_en": "Run after healing"},
            {"id": "verify-indicators", "name_en": "Verify indicators"},
        ],
    }


def _fault_catalog_item(fault_id: str, description: str) -> dict[str, Any]:
    metadata: dict[str, dict[str, str]] = {
        "radiation_cpu_lock": {
            "display_name_zh": "辐射导致节点处理迟滞",
            "description_zh": "对目标节点增加处理时延，模拟辐射导致的 CPU 锁定或恢复迟滞。",
            "target_scope": "node",
            "implementation_status": "implemented",
            "implemented_effect": "node_processing_delay_ms increased",
        },
        "dust_antenna_degradation": {
            "display_name_zh": "月尘天线退化",
            "description_zh": "对射频链路降低天线增益、降低可用率并提高丢包率。",
            "target_scope": "all_rf_links",
            "implementation_status": "implemented",
            "implemented_effect": "RF link gain, availability, and packet loss degraded",
        },
        "main_hub_failure": {
            "display_name_zh": "主枢纽失效",
            "description_zh": "关闭目标主枢纽节点及其相邻链路；故障阶段继承正常路径，不自动重路由。",
            "target_scope": "node",
            "implementation_status": "implemented",
            "implemented_effect": "target node and adjacent links disabled",
        },
        "relay_handover_delay": {
            "display_name_zh": "中继切换时延异常",
            "description_zh": "对月面到轨道、轨道到地面链路增加切换扰动时延。",
            "target_scope": "all_rf_links",
            "implementation_status": "implemented",
            "implemented_effect": "handover delay added to relay links",
        },
        "buffer_overflow": {
            "display_name_zh": "多业务缓冲溢出",
            "description_zh": "对链路设置拥塞倍率，用于影响后续业务仿真。",
            "target_scope": "global",
            "implementation_status": "implemented",
            "implemented_effect": "congestion multiplier increased",
        },
    }
    item = metadata.get(
        fault_id,
        {
            "display_name_zh": fault_id,
            "description_zh": "该故障已纳入故障库，但当前 MVP 尚未实现专属退化作用。",
            "target_scope": "node_or_link",
            "implementation_status": "registered_only",
            "implemented_effect": "fault registered without additional MVP degradation",
        },
    )
    return {
        "id": fault_id,
        "code": fault_id,
        "description": description,
        **item,
    }
