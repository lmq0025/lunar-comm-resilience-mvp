"""Persistence service functions used by the FastAPI layer."""

from __future__ import annotations

import hashlib
import json
import os
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from sqlalchemy import Select, desc, select
from sqlalchemy.orm import Session

from lunar_comm_sim.api.serializers import json_safe
from lunar_comm_sim.app_data import runs_dir
from lunar_comm_sim.persistence.models import Artifact, AuditEvent, Job, Project, ProjectVersion, RunStep, SimulationRun, User
from lunar_comm_sim.sim.staged_engine import STEP_SEQUENCE, artifact_manifest

LOCAL_ADMIN_ID = "local_admin"
AUTH_MODE_ENV = "LUNAR_AUTH_MODE"


def json_dumps(value: Any) -> str:
    return json.dumps(json_safe(value), ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def json_loads(value: str | None, default: Any = None) -> Any:
    if value is None:
        return default
    return json.loads(value)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def auth_mode() -> str:
    return os.environ.get(AUTH_MODE_ENV, "disabled").strip().lower() or "disabled"


def ensure_local_admin(session: Session) -> User:
    user = session.get(User, LOCAL_ADMIN_ID)
    if user is None:
        user = User(
            id=LOCAL_ADMIN_ID,
            username="local_admin",
            password_hash=None,
            role="admin",
            is_active=True,
        )
        session.add(user)
        session.flush()
    return user


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("ascii"), 200_000)
    return f"pbkdf2_sha256${salt}${digest.hex()}"


def verify_password(password: str, stored: str | None) -> bool:
    if not stored:
        return False
    try:
        scheme, salt, expected = stored.split("$", 2)
    except ValueError:
        return False
    if scheme != "pbkdf2_sha256":
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("ascii"), 200_000)
    return secrets.compare_digest(digest.hex(), expected)


def create_project(
    session: Session,
    *,
    owner_user_id: str,
    name: str,
    description: str,
    scenario: dict[str, Any],
    editor: dict[str, Any] | None = None,
) -> Project:
    project = Project(
        id=str(uuid4()),
        owner_user_id=owner_user_id,
        name=name,
        description=description,
        scenario_json=json_dumps(scenario),
        editor_json=json_dumps(editor or {}),
        revision=1,
    )
    session.add(project)
    session.flush()
    add_project_version(session, project, owner_user_id)
    return project


def update_project(
    session: Session,
    project: Project,
    *,
    user_id: str,
    expected_revision: int | None,
    name: str | None = None,
    description: str | None = None,
    scenario: dict[str, Any] | None = None,
    editor: dict[str, Any] | None = None,
) -> Project:
    if expected_revision is not None and project.revision != expected_revision:
        raise RevisionConflictError(project.revision)
    if name is not None:
        project.name = name
    if description is not None:
        project.description = description
    if scenario is not None:
        project.scenario_json = json_dumps(scenario)
    if editor is not None:
        project.editor_json = json_dumps(editor)
    project.revision += 1
    session.flush()
    add_project_version(session, project, user_id)
    return project


def copy_project(session: Session, project: Project, *, user_id: str, name: str | None = None) -> Project:
    return create_project(
        session,
        owner_user_id=user_id,
        name=name or f"{project.name} - Copy",
        description=project.description,
        scenario=json_loads(project.scenario_json, {}),
        editor=json_loads(project.editor_json, {}),
    )


def add_project_version(session: Session, project: Project, user_id: str) -> ProjectVersion:
    version = ProjectVersion(
        id=str(uuid4()),
        project_id=project.id,
        revision=project.revision,
        name=project.name,
        description=project.description,
        scenario_json=project.scenario_json,
        editor_json=project.editor_json,
        created_by_user_id=user_id,
    )
    session.add(version)
    session.flush()
    return version


def project_to_dict(project: Project, *, include_document: bool = True) -> dict[str, Any]:
    payload = {
        "project_id": project.id,
        "owner_user_id": project.owner_user_id,
        "name": project.name,
        "description": project.description,
        "revision": project.revision,
        "deleted": project.deleted,
        "created_at": project.created_at.isoformat(),
        "updated_at": project.updated_at.isoformat(),
    }
    if include_document:
        payload["scenario"] = json_loads(project.scenario_json, {})
        payload["editor"] = json_loads(project.editor_json, {})
    return payload


def project_version_to_dict(version: ProjectVersion) -> dict[str, Any]:
    return {
        "version_id": version.id,
        "project_id": version.project_id,
        "revision": version.revision,
        "name": version.name,
        "description": version.description,
        "scenario": json_loads(version.scenario_json, {}),
        "editor": json_loads(version.editor_json, {}),
        "created_at": version.created_at.isoformat(),
        "created_by_user_id": version.created_by_user_id,
    }


def create_run(
    session: Session,
    *,
    owner_user_id: str,
    session_id: str,
    scenario: dict[str, Any],
    project_id: str | None = None,
    project_revision: int | None = None,
    output_dir: Path | str | None = None,
) -> SimulationRun:
    run_id = str(uuid4())
    run = SimulationRun(
        id=run_id,
        session_id=session_id,
        project_id=project_id,
        project_revision=project_revision,
        owner_user_id=owner_user_id,
        scenario_name=scenario.get("scenario", {}).get("name") if isinstance(scenario.get("scenario"), dict) else None,
        scenario_json=json_dumps(scenario),
        output_dir=str(output_dir) if output_dir is not None else str(runs_dir() / run_id),
        status="running",
        current_step="created",
        completed_steps_json="[]",
    )
    session.add(run)
    session.flush()
    return run


def update_run_from_state(session: Session, run: SimulationRun, state: Any) -> None:
    run.current_step = state.current_step
    run.completed_steps_json = json_dumps(list(state.completed_steps))
    run.output_dir = str(state.output_dir) if state.output_dir is not None else run.output_dir
    run.status = "completed" if len(state.completed_steps) == len(STEP_SEQUENCE) else "running"
    run.updated_at = datetime.now(timezone.utc)


def persist_step_response(
    session: Session,
    run: SimulationRun,
    *,
    step_name: str,
    response: dict[str, Any],
    state: Any,
) -> RunStep:
    update_run_from_state(session, run, state)
    index = STEP_SEQUENCE.index(step_name) + 1 if step_name in STEP_SEQUENCE else 0
    row = session.execute(select(RunStep).where(RunStep.run_id == run.id, RunStep.step_name == step_name)).scalar_one_or_none()
    if row is None:
        row = RunStep(id=str(uuid4()), run_id=run.id, step_name=step_name, step_index=index, response_json=json_dumps(response))
        session.add(row)
    else:
        row.response_json = json_dumps(response)
    session.flush()
    if step_name == STEP_SEQUENCE[-1]:
        persist_artifacts(session, run, state)
    return row


def persist_artifacts(session: Session, run: SimulationRun, state: Any) -> None:
    existing = {artifact.filename: artifact for artifact in run.artifacts}
    for item in artifact_manifest(state):
        artifact = existing.get(item["filename"])
        if artifact is None:
            artifact = Artifact(id=str(uuid4()), run_id=run.id, filename=item["filename"], relative_path=item["relative_path"])
            session.add(artifact)
        artifact.relative_path = item["relative_path"]
        artifact.size_bytes = int(item.get("size_bytes") or 0)
        artifact.file_type = item.get("file_type")
        artifact.purpose_zh = item.get("purpose_zh")
    session.flush()


def run_to_dict(run: SimulationRun, *, include_steps: bool = True) -> dict[str, Any]:
    steps = sorted(run.steps, key=lambda item: item.step_index)
    return {
        "run_id": run.id,
        "session_id": run.session_id,
        "project_id": run.project_id,
        "project_revision": run.project_revision,
        "owner_user_id": run.owner_user_id,
        "scenario_name": run.scenario_name,
        "status": run.status,
        "current_step": run.current_step,
        "completed_steps": json_loads(run.completed_steps_json, []),
        "output_dir": run.output_dir,
        "created_at": run.created_at.isoformat(),
        "updated_at": run.updated_at.isoformat(),
        "steps": [run_step_to_dict(step) for step in steps] if include_steps else [],
        "artifacts": [artifact_to_dict(artifact) for artifact in run.artifacts],
    }


def run_step_to_dict(step: RunStep) -> dict[str, Any]:
    return {
        "step_name": step.step_name,
        "step_index": step.step_index,
        "response": json_loads(step.response_json, {}),
        "created_at": step.created_at.isoformat(),
    }


def artifact_to_dict(artifact: Artifact) -> dict[str, Any]:
    return {
        "filename": artifact.filename,
        "relative_path": artifact.relative_path,
        "exists": Path(artifact.relative_path).exists(),
        "size_bytes": artifact.size_bytes,
        "file_type": artifact.file_type,
        "purpose_zh": artifact.purpose_zh,
    }


def latest_run_query(user_id: str, project_id: str | None = None) -> Select[tuple[SimulationRun]]:
    query = select(SimulationRun).where(SimulationRun.owner_user_id == user_id).order_by(desc(SimulationRun.updated_at))
    if project_id:
        query = query.where(SimulationRun.project_id == project_id)
    return query


def add_audit_event(
    session: Session,
    *,
    user_id: str | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    request_id: str | None = None,
    payload: dict[str, Any] | None = None,
) -> AuditEvent:
    event = AuditEvent(
        id=str(uuid4()),
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        request_id=request_id,
        payload_json=json_dumps(payload or {}),
    )
    session.add(event)
    return event


def job_to_dict(job: Job) -> dict[str, Any]:
    return {
        "job_id": job.id,
        "run_id": job.run_id,
        "step_name": job.step_name,
        "status": job.status,
        "cancellation_requested": job.cancellation_requested,
        "result": json_loads(job.result_json, None),
        "error": json_loads(job.error_json, None),
        "created_at": job.created_at.isoformat(),
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "finished_at": job.finished_at.isoformat() if job.finished_at else None,
    }


class RevisionConflictError(RuntimeError):
    def __init__(self, current_revision: int) -> None:
        self.current_revision = current_revision
        super().__init__("project revision conflict")
