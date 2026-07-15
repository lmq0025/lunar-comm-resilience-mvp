"""FastAPI application for the staged lunar communication simulator."""

from __future__ import annotations

import os
import uuid
from io import BytesIO
from pathlib import Path
from typing import Any
from zipfile import ZIP_DEFLATED, ZipFile

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import select

from lunar_comm_sim.api.jobs import JobManager
from lunar_comm_sim.api.recovery import STEP_RESPONSE_MODELS, recover_run_session, step_name_from_endpoint
from lunar_comm_sim.api.schemas import (
    AnalyzeFaultImpactStepResponse,
    ArtifactManifestResponse,
    BuildTopologyStepResponse,
    CalculateRoutesStepResponse,
    CatalogResponse,
    ChangePasswordRequest,
    ClientErrorRequest,
    ClientErrorResponse,
    DeleteSessionResponse,
    ErrorResponse,
    ExecuteHealingStepResponse,
    GraphSnapshotResponse,
    HealthResponse,
    InjectFaultsStepResponse,
    JobResponse,
    LoginRequest,
    LoginResponse,
    ProjectCopyRequest,
    ProjectCreateRequest,
    ProjectListResponse,
    ProjectResponse,
    ProjectRestoreRequest,
    ProjectUpdateRequest,
    ProjectVersionListResponse,
    RecalculateRoutesStepResponse,
    RestoreRunSessionResponse,
    RunAfterHealingStepResponse,
    RunNominalStepResponse,
    ScenarioPayload,
    ScenarioValidationResponse,
    SessionCreateRequest,
    SessionSummaryResponse,
    SimulationRunListResponse,
    SimulationRunResponse,
    StepResponse,
    UserCreateRequest,
    UserResponse,
    UserUpdateRequest,
    VerifyIndicatorsStepResponse,
)
from lunar_comm_sim.api.serializers import json_safe
from lunar_comm_sim.api.session_store import SessionNotFoundError, SimulationSessionStore
from lunar_comm_sim.api.step_service import execute_step, session_summary, validate_scenario_payload
from lunar_comm_sim.app_data import ensure_app_data_dirs
from lunar_comm_sim.core.faults import FAULT_LIBRARY
from lunar_comm_sim.core.healing import HEALING_STRATEGIES
from lunar_comm_sim.logging_config import configure_logging, log_client_error
from lunar_comm_sim.persistence.database import init_database, session_scope
from lunar_comm_sim.persistence.models import Job, Project, ProjectVersion, SimulationRun, User
from lunar_comm_sim.persistence.services import (
    RevisionConflictError,
    add_audit_event,
    auth_mode,
    copy_project,
    create_project as persist_project,
    create_run,
    ensure_local_admin,
    hash_password,
    job_to_dict,
    json_dumps,
    json_loads,
    latest_run_query,
    persist_step_response,
    project_to_dict,
    project_version_to_dict,
    run_to_dict,
    update_project as persist_project_update,
)
from lunar_comm_sim.sim.staged_engine import STEP_ENDPOINTS, REQUIRED_OUTPUTS, InvalidStepOrderError, artifact_manifest, snapshot_for_stage


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
job_manager: JobManager | None = None


@app.on_event("startup")
def startup() -> None:
    _ensure_runtime_ready()
    global job_manager
    job_manager = JobManager(_execute_job_step)
    job_manager.mark_interrupted_jobs()


@app.on_event("shutdown")
def shutdown() -> None:
    if job_manager is not None:
        job_manager.shutdown()


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


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
    _ensure_runtime_ready()
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


def current_user() -> dict[str, Any]:
    _ensure_runtime_ready()
    with session_scope() as session:
        user = ensure_local_admin(session)
        return {
            "user_id": user.id,
            "username": user.username,
            "role": user.role,
            "is_active": user.is_active,
            "auth_mode": auth_mode(),
        }


@app.get("/api/v1/auth/me", response_model=UserResponse)
def auth_me(user: dict[str, Any] = Depends(current_user)) -> JSONResponse:
    return _safe_response(UserResponse, user)


@app.post("/api/v1/auth/login", response_model=LoginResponse)
def auth_login(request: LoginRequest) -> JSONResponse:
    with session_scope() as session:
        if auth_mode() == "disabled":
            user = ensure_local_admin(session)
            return _safe_response(LoginResponse, {"user": _user_to_dict(user), "token": None})
        user = session.execute(select(User).where(User.username == request.username)).scalar_one_or_none()
        if user is None or not user.is_active:
            raise HTTPException(status_code=401, detail="invalid credentials")
        from lunar_comm_sim.persistence.services import verify_password

        if not verify_password(request.password, user.password_hash):
            raise HTTPException(status_code=401, detail="invalid credentials")
        return _safe_response(LoginResponse, {"user": _user_to_dict(user), "token": None})


@app.post("/api/v1/auth/logout", response_model=DeleteSessionResponse)
def auth_logout() -> JSONResponse:
    return _safe_response(DeleteSessionResponse, {"deleted": True, "session_id": "auth"})


@app.post("/api/v1/auth/change-password", response_model=UserResponse)
def change_password(request: ChangePasswordRequest, user: dict[str, Any] = Depends(current_user)) -> JSONResponse:
    with session_scope() as session:
        db_user = session.get(User, user["user_id"])
        if db_user is None:
            raise HTTPException(status_code=404, detail="user not found")
        db_user.password_hash = hash_password(request.new_password)
        session.flush()
        return _safe_response(UserResponse, _user_to_dict(db_user))


@app.post("/api/v1/users", response_model=UserResponse)
def create_user(request: UserCreateRequest, user: dict[str, Any] = Depends(current_user)) -> JSONResponse:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="admin role required")
    with session_scope() as session:
        db_user = User(
            id=str(uuid.uuid4()),
            username=request.username,
            password_hash=hash_password(request.password),
            role=request.role,
            is_active=True,
        )
        session.add(db_user)
        session.flush()
        return _safe_response(UserResponse, _user_to_dict(db_user))


@app.patch("/api/v1/users/{user_id}", response_model=UserResponse)
def update_user(user_id: str, request: UserUpdateRequest, user: dict[str, Any] = Depends(current_user)) -> JSONResponse:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="admin role required")
    with session_scope() as session:
        db_user = session.get(User, user_id)
        if db_user is None:
            raise HTTPException(status_code=404, detail="user not found")
        if request.is_active is not None:
            db_user.is_active = request.is_active
        if request.role is not None:
            db_user.role = request.role
        session.flush()
        return _safe_response(UserResponse, _user_to_dict(db_user))


@app.post("/api/v1/scenarios/validate", response_model=ScenarioValidationResponse)
def validate_scenario(raw: ScenarioPayload) -> JSONResponse:
    return _safe_response(ScenarioValidationResponse, validate_scenario_payload(raw.model_dump(mode="python")))


@app.get("/api/v1/projects", response_model=ProjectListResponse)
def list_projects(user: dict[str, Any] = Depends(current_user)) -> JSONResponse:
    with session_scope() as session:
        rows = session.execute(
            select(Project).where(Project.owner_user_id == user["user_id"], Project.deleted.is_(False)).order_by(Project.updated_at.desc())
        ).scalars()
        return _safe_response(ProjectListResponse, {"projects": [project_to_dict(row) for row in rows]})


@app.post("/api/v1/projects", response_model=ProjectResponse)
def create_project(request: ProjectCreateRequest, user: dict[str, Any] = Depends(current_user)) -> JSONResponse:
    scenario = request.scenario.model_dump(mode="python")
    validation = validate_scenario_payload(scenario)
    if not validation["valid"]:
        raise HTTPException(status_code=422, detail=validation)
    with session_scope() as session:
        project = persist_project(
            session,
            owner_user_id=user["user_id"],
            name=request.name,
            description=request.description,
            scenario=scenario,
            editor=request.editor,
        )
        add_audit_event(session, user_id=user["user_id"], action="project.create", entity_type="project", entity_id=project.id)
        return _safe_response(ProjectResponse, project_to_dict(project))


@app.get("/api/v1/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, user: dict[str, Any] = Depends(current_user)) -> JSONResponse:
    with session_scope() as session:
        project = _owned_project(session, project_id, user["user_id"])
        return _safe_response(ProjectResponse, project_to_dict(project))


@app.put("/api/v1/projects/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, request: ProjectUpdateRequest, user: dict[str, Any] = Depends(current_user)) -> JSONResponse:
    scenario = request.scenario.model_dump(mode="python") if request.scenario is not None else None
    if scenario is not None:
        validation = validate_scenario_payload(scenario)
        if not validation["valid"]:
            raise HTTPException(status_code=422, detail=validation)
    with session_scope() as session:
        project = _owned_project(session, project_id, user["user_id"])
        try:
            updated = persist_project_update(
                session,
                project,
                user_id=user["user_id"],
                expected_revision=request.expected_revision,
                name=request.name,
                description=request.description,
                scenario=scenario,
                editor=request.editor,
            )
        except RevisionConflictError as exc:
            raise HTTPException(status_code=409, detail={"code": "REVISION_CONFLICT", "current_revision": exc.current_revision}) from exc
        add_audit_event(session, user_id=user["user_id"], action="project.update", entity_type="project", entity_id=project.id)
        return _safe_response(ProjectResponse, project_to_dict(updated))


@app.delete("/api/v1/projects/{project_id}", response_model=DeleteSessionResponse)
def delete_project(project_id: str, user: dict[str, Any] = Depends(current_user)) -> JSONResponse:
    with session_scope() as session:
        project = _owned_project(session, project_id, user["user_id"])
        project.deleted = True
        add_audit_event(session, user_id=user["user_id"], action="project.delete", entity_type="project", entity_id=project.id)
        return _safe_response(DeleteSessionResponse, {"deleted": True, "session_id": project_id})


@app.post("/api/v1/projects/{project_id}/copy", response_model=ProjectResponse)
def copy_project_route(project_id: str, request: ProjectCopyRequest, user: dict[str, Any] = Depends(current_user)) -> JSONResponse:
    with session_scope() as session:
        project = _owned_project(session, project_id, user["user_id"])
        copied = copy_project(session, project, user_id=user["user_id"], name=request.name)
        add_audit_event(session, user_id=user["user_id"], action="project.copy", entity_type="project", entity_id=copied.id)
        return _safe_response(ProjectResponse, project_to_dict(copied))


@app.get("/api/v1/projects/{project_id}/versions", response_model=ProjectVersionListResponse)
def list_project_versions(project_id: str, user: dict[str, Any] = Depends(current_user)) -> JSONResponse:
    with session_scope() as session:
        _owned_project(session, project_id, user["user_id"])
        versions = session.execute(
            select(ProjectVersion).where(ProjectVersion.project_id == project_id).order_by(ProjectVersion.revision.desc())
        ).scalars()
        return _safe_response(ProjectVersionListResponse, {"versions": [project_version_to_dict(version) for version in versions]})


@app.post("/api/v1/projects/{project_id}/restore", response_model=ProjectResponse)
def restore_project_version(project_id: str, request: ProjectRestoreRequest, user: dict[str, Any] = Depends(current_user)) -> JSONResponse:
    with session_scope() as session:
        project = _owned_project(session, project_id, user["user_id"])
        version = session.execute(
            select(ProjectVersion).where(ProjectVersion.project_id == project_id, ProjectVersion.revision == request.revision)
        ).scalar_one_or_none()
        if version is None:
            raise HTTPException(status_code=404, detail="project version not found")
        restored = persist_project_update(
            session,
            project,
            user_id=user["user_id"],
            expected_revision=None,
            name=version.name,
            description=version.description,
            scenario=json_loads(version.scenario_json, {}),
            editor=json_loads(version.editor_json, {}),
        )
        add_audit_event(session, user_id=user["user_id"], action="project.restore", entity_type="project", entity_id=project.id)
        return _safe_response(ProjectResponse, project_to_dict(restored))


@app.post("/api/v1/sessions", response_model=SessionSummaryResponse)
def create_session(request: SessionCreateRequest, user: dict[str, Any] = Depends(current_user)) -> JSONResponse:
    scenario = request.scenario.model_dump(mode="python")
    validation = validate_scenario_payload(scenario)
    if not validation["valid"]:
        return _safe_response(ScenarioValidationResponse, validation, status_code=422)
    state = store.create(scenario)
    with session_scope() as session:
        run = create_run(
            session,
            owner_user_id=user["user_id"],
            session_id=state.session_id,
            scenario=scenario,
            project_id=request.project_id,
            project_revision=request.project_revision,
            output_dir=state.output_dir,
        )
        add_audit_event(session, user_id=user["user_id"], action="run.create", entity_type="run", entity_id=run.id)
        return _safe_response(SessionSummaryResponse, _session_summary_with_run(state, run))


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


@app.post("/api/v1/sessions/{session_id}/steps/execute-healing", response_model=ExecuteHealingStepResponse)
def execute_healing(session_id: str) -> JSONResponse:
    return _execute_locked_step(session_id, "execute-healing", ExecuteHealingStepResponse)


@app.post("/api/v1/sessions/{session_id}/steps/recalculate-routes", response_model=RecalculateRoutesStepResponse)
def recalculate_routes(session_id: str) -> JSONResponse:
    return _execute_locked_step(session_id, "recalculate-routes", RecalculateRoutesStepResponse)


@app.post("/api/v1/sessions/{session_id}/steps/run-after-healing", response_model=RunAfterHealingStepResponse)
def run_after_healing(session_id: str) -> JSONResponse:
    return _execute_locked_step(session_id, "run-after-healing", RunAfterHealingStepResponse)


@app.post("/api/v1/sessions/{session_id}/steps/verify-indicators", response_model=VerifyIndicatorsStepResponse)
def verify_indicators(session_id: str) -> JSONResponse:
    return _execute_locked_step(session_id, "verify-indicators", VerifyIndicatorsStepResponse)


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


@app.get("/api/v1/sessions/{session_id}/artifacts/files/{filename}")
def download_artifact_file(session_id: str, filename: str) -> FileResponse:
    with store.locked_session(session_id) as state:
        path = _allowed_artifact_path(state.output_dir, filename)
        if not path.exists() or not path.is_file():
            raise HTTPException(status_code=404, detail="artifact file not found")
        return FileResponse(path, filename=filename)


@app.get("/api/v1/sessions/{session_id}/artifacts/bundle")
def download_artifact_bundle(session_id: str) -> StreamingResponse:
    with store.locked_session(session_id) as state:
        output_dir = Path(state.output_dir) if state.output_dir is not None else Path()
        buffer = BytesIO()
        with ZipFile(buffer, "w", ZIP_DEFLATED) as archive:
            for filename in REQUIRED_OUTPUTS:
                path = _allowed_artifact_path(output_dir, filename)
                if path.exists() and path.is_file():
                    archive.write(path, arcname=filename)
        buffer.seek(0)
        short_id = session_id.split("-", 1)[0]
        headers = {"Content-Disposition": f'attachment; filename="lunar_comm_{short_id}_results.zip"'}
        return StreamingResponse(buffer, media_type="application/zip", headers=headers)


@app.get("/api/v1/runs", response_model=SimulationRunListResponse)
def list_runs(project_id: str | None = None, user: dict[str, Any] = Depends(current_user)) -> JSONResponse:
    with session_scope() as session:
        runs = session.execute(latest_run_query(user["user_id"], project_id).limit(50)).scalars()
        return _safe_response(SimulationRunListResponse, {"runs": [run_to_dict(run) for run in runs]})


@app.get("/api/v1/runs/latest", response_model=SimulationRunResponse)
def get_latest_run(project_id: str | None = None, user: dict[str, Any] = Depends(current_user)) -> JSONResponse:
    with session_scope() as session:
        run = session.execute(latest_run_query(user["user_id"], project_id).limit(1)).scalar_one_or_none()
        if run is None:
            raise HTTPException(status_code=404, detail="run not found")
        return _safe_response(SimulationRunResponse, run_to_dict(run))


@app.get("/api/v1/runs/{run_id}", response_model=SimulationRunResponse)
def get_run(run_id: str, user: dict[str, Any] = Depends(current_user)) -> JSONResponse:
    with session_scope() as session:
        run = _owned_run(session, run_id, user["user_id"])
        return _safe_response(SimulationRunResponse, run_to_dict(run))


@app.post("/api/v1/runs/{run_id}/restore-session", response_model=RestoreRunSessionResponse)
def restore_run_session(run_id: str, user: dict[str, Any] = Depends(current_user)) -> JSONResponse:
    with session_scope() as session:
        run = _owned_run(session, run_id, user["user_id"])
        summary = recover_run_session(store, session, run)
        return _safe_response(RestoreRunSessionResponse, {"session": _merge_summary_run(summary, run), "run": run_to_dict(run)})


@app.post("/api/v1/runs/{run_id}/jobs/{step_name}", response_model=JobResponse)
def create_step_job(run_id: str, step_name: str, user: dict[str, Any] = Depends(current_user)) -> JSONResponse:
    with session_scope() as session:
        _owned_run(session, run_id, user["user_id"])
    manager = _require_job_manager()
    try:
        job = manager.create_job(run_id, step_name)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="run not found") from exc
    return _safe_response(JobResponse, job)


@app.get("/api/v1/jobs/{job_id}", response_model=JobResponse)
def get_job(job_id: str) -> JSONResponse:
    manager = _require_job_manager()
    try:
        return _safe_response(JobResponse, manager.get_job(job_id))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="job not found") from exc


@app.post("/api/v1/jobs/{job_id}/cancel", response_model=JobResponse)
def cancel_job(job_id: str) -> JSONResponse:
    manager = _require_job_manager()
    try:
        return _safe_response(JobResponse, manager.cancel_job(job_id))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="job not found") from exc


@app.post("/api/v1/client-errors", response_model=ClientErrorResponse)
def record_client_error(request: Request, payload: ClientErrorRequest, user: dict[str, Any] = Depends(current_user)) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    body = payload.model_dump(mode="python")
    log_client_error(body, request_id)
    with session_scope() as session:
        add_audit_event(
            session,
            user_id=user["user_id"],
            action="client.error",
            entity_type="client_error",
            request_id=request_id,
            payload=body,
        )
    return _safe_response(ClientErrorResponse, {"recorded": True, "request_id": request_id})


def _execute_locked_step(
    session_id: str,
    step_endpoint: str,
    response_model: type[BaseModel] = StepResponse,
) -> JSONResponse:
    with store.locked_session(session_id) as state:
        response = execute_step(state, step_endpoint)
        safe_content = json_safe(response)
        validated = response_model.model_validate(safe_content)
        with session_scope() as session:
            run = session.execute(select(SimulationRun).where(SimulationRun.session_id == session_id)).scalar_one_or_none()
            if run is not None:
                persist_step_response(
                    session,
                    run,
                    step_name=step_name_from_endpoint(step_endpoint),
                    response=validated.model_dump(mode="json"),
                    state=state,
                )
        return JSONResponse(content=validated.model_dump(mode="json"))


def _safe_response(model: type[BaseModel], content: Any, status_code: int = 200) -> JSONResponse:
    safe_content = json_safe(content)
    validated = model.model_validate(safe_content)
    return JSONResponse(status_code=status_code, content=validated.model_dump(mode="json"))


def _execute_job_step(run_id: str, step_name: str) -> dict[str, Any]:
    endpoint = STEP_ENDPOINTS.get(step_name)
    if endpoint is None:
        raise HTTPException(status_code=404, detail="unknown step name")
    with session_scope() as session:
        run = session.get(SimulationRun, run_id)
        if run is None:
            raise KeyError(run_id)
        recover_run_session(store, session, run)
        session_id = run.session_id
    response_model = STEP_RESPONSE_MODELS.get(step_name, StepResponse)
    with store.locked_session(session_id) as state:
        response = execute_step(state, endpoint)
        safe_content = json_safe(response)
        validated = response_model.model_validate(safe_content).model_dump(mode="json")
        with session_scope() as session:
            run = session.get(SimulationRun, run_id)
            if run is None:
                raise KeyError(run_id)
            persist_step_response(session, run, step_name=step_name, response=validated, state=state)
        return validated


def _session_summary_with_run(state: Any, run: SimulationRun) -> dict[str, Any]:
    return _merge_summary_run(session_summary(state), run)


def _merge_summary_run(summary: dict[str, Any], run: SimulationRun) -> dict[str, Any]:
    return {
        **summary,
        "run_id": run.id,
        "project_id": run.project_id,
        "project_revision": run.project_revision,
    }


def _owned_project(session, project_id: str, user_id: str) -> Project:
    project = session.get(Project, project_id)
    if project is None or project.deleted or project.owner_user_id != user_id:
        raise HTTPException(status_code=404, detail="project not found")
    return project


def _owned_run(session, run_id: str, user_id: str) -> SimulationRun:
    run = session.get(SimulationRun, run_id)
    if run is None or run.owner_user_id != user_id:
        raise HTTPException(status_code=404, detail="run not found")
    return run


def _require_job_manager() -> JobManager:
    _ensure_runtime_ready()
    global job_manager
    if job_manager is None:
        job_manager = JobManager(_execute_job_step)
        job_manager.mark_interrupted_jobs()
    if job_manager is None:
        raise HTTPException(status_code=503, detail="job manager is not ready")
    return job_manager


def _ensure_runtime_ready() -> None:
    ensure_app_data_dirs()
    configure_logging()
    init_database()
    with session_scope() as session:
        ensure_local_admin(session)


def _user_to_dict(user: User) -> dict[str, Any]:
    return {
        "user_id": user.id,
        "username": user.username,
        "role": user.role,
        "is_active": user.is_active,
        "auth_mode": auth_mode(),
    }


def _allowed_artifact_path(output_dir: str | os.PathLike[str] | None, filename: str) -> Path:
    if filename not in REQUIRED_OUTPUTS or Path(filename).name != filename or Path(filename).is_absolute():
        raise HTTPException(status_code=404, detail="artifact file not found")
    base = Path(output_dir) if output_dir is not None else Path()
    path = (base / filename).resolve()
    try:
        path.relative_to(base.resolve())
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="artifact file not found") from exc
    return path


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
        "healing_strategies": [_healing_catalog_item(key, value) for key, value in HEALING_STRATEGIES.items()],
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


def _healing_catalog_item(strategy_id: str, description: str) -> dict[str, Any]:
    metadata: dict[str, dict[str, Any]] = {
        "reroute_backup_path": {
            "display_name_zh": "备用路径重路由",
            "description_zh": "在当前活动拓扑上重新计算业务路径。",
            "execution_step": 7,
            "strategy_category": "routing",
            "target_summary_zh": "所有需要恢复连通性的业务路径",
            "preconditions_zh": "故障后仍存在可用备用链路。",
            "implemented_effect": "recompute active backup paths",
        },
        "priority_scheduling": {
            "display_name_zh": "高优先级业务调度",
            "description_zh": "保护 control_command 和 teleoperation 业务。",
            "execution_step": 6,
            "strategy_category": "non_routing",
            "target_summary_zh": "控制指令和遥操作业务",
            "preconditions_zh": "场景中存在 control_command 或 teleoperation 业务。",
            "implemented_effect": "reserve bandwidth and loss protection",
        },
        "service_degradation": {
            "display_name_zh": "业务降级传输",
            "description_zh": "将 hd_video 需求带宽降为 degraded_bandwidth_mbps。",
            "execution_step": 6,
            "strategy_category": "non_routing",
            "target_summary_zh": "高清视频回传业务",
            "preconditions_zh": "存在 hd_video 且配置了 degraded_bandwidth_mbps。",
            "implemented_effect": "reduce HD video bandwidth demand",
        },
        "store_and_forward": {
            "display_name_zh": "存储转发",
            "description_zh": "缓存 science_data 并在网络恢复后继续转发。",
            "execution_step": 6,
            "strategy_category": "non_routing",
            "target_summary_zh": "科学数据回传业务",
            "preconditions_zh": "场景中存在 science_data 业务。",
            "implemented_effect": "buffer science data for resume forwarding",
        },
        "relay_pre_handover": {
            "display_name_zh": "中继预切换",
            "description_zh": "降低中继切换扰动时延。",
            "execution_step": 6,
            "strategy_category": "non_routing",
            "target_summary_zh": "存在切换扰动的中继链路",
            "preconditions_zh": "故障链路存在 handover disturbance。",
            "implemented_effect": "reduce relay handover disturbance",
        },
    }
    return {
        "id": strategy_id,
        "code": strategy_id,
        "description": description,
        "implementation_status": "implemented",
        **metadata[strategy_id],
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


def _frontend_dist_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "frontend" / "dist"


frontend_dist = _frontend_dist_dir()
if frontend_dist.exists():
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")

    @app.get("/", include_in_schema=False)
    def serve_frontend_root() -> HTMLResponse:
        return HTMLResponse((frontend_dist / "index.html").read_text(encoding="utf-8"))

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend_spa(full_path: str) -> HTMLResponse:
        reserved = ("api/", "docs", "openapi.json", "redoc")
        if full_path.startswith(reserved):
            raise HTTPException(status_code=404, detail="not found")
        return HTMLResponse((frontend_dist / "index.html").read_text(encoding="utf-8"))
