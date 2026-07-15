"""Lightweight persistent background jobs for step execution."""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Callable
from uuid import uuid4

from sqlalchemy import select

from lunar_comm_sim.persistence.database import session_scope
from lunar_comm_sim.persistence.models import Job, SimulationRun
from lunar_comm_sim.persistence.services import job_to_dict, json_dumps

logger = logging.getLogger("lunar_comm_sim.jobs")


class JobManager:
    def __init__(self, execute_callback: Callable[[str, str], dict]) -> None:
        self._executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="lunar-job")
        self._execute_callback = execute_callback

    def create_job(self, run_id: str, step_name: str) -> dict:
        with session_scope() as session:
            run = session.get(SimulationRun, run_id)
            if run is None:
                raise KeyError(run_id)
            job = Job(id=str(uuid4()), run_id=run_id, step_name=step_name, status="queued")
            session.add(job)
            session.flush()
            payload = job_to_dict(job)
        self._executor.submit(self._run_job, payload["job_id"])
        return payload

    def get_job(self, job_id: str) -> dict:
        with session_scope() as session:
            job = session.get(Job, job_id)
            if job is None:
                raise KeyError(job_id)
            return job_to_dict(job)

    def cancel_job(self, job_id: str) -> dict:
        with session_scope() as session:
            job = session.get(Job, job_id)
            if job is None:
                raise KeyError(job_id)
            job.cancellation_requested = True
            if job.status == "queued":
                job.status = "cancelled"
                job.finished_at = datetime.now(timezone.utc)
            session.flush()
            return job_to_dict(job)

    def mark_interrupted_jobs(self) -> None:
        with session_scope() as session:
            for job in session.execute(select(Job).where(Job.status.in_(["queued", "running"]))).scalars():
                job.status = "interrupted"
                job.finished_at = datetime.now(timezone.utc)

    def shutdown(self) -> None:
        self._executor.shutdown(wait=False, cancel_futures=True)

    def _run_job(self, job_id: str) -> None:
        with session_scope() as session:
            job = session.get(Job, job_id)
            if job is None or job.status == "cancelled" or job.cancellation_requested:
                return
            job.status = "running"
            job.started_at = datetime.now(timezone.utc)
            run_id = job.run_id
            step_name = job.step_name
        try:
            result = self._execute_callback(run_id, step_name)
        except Exception as exc:  # noqa: BLE001 - persisted job error
            logger.exception("background job failed", extra={"request_id": "-"})
            with session_scope() as session:
                job = session.get(Job, job_id)
                if job is not None:
                    job.status = "failed"
                    job.error_json = json_dumps({"message": str(exc), "type": type(exc).__name__})
                    job.finished_at = datetime.now(timezone.utc)
            return
        with session_scope() as session:
            job = session.get(Job, job_id)
            if job is not None:
                job.status = "cancelled" if job.cancellation_requested else "completed"
                job.result_json = json_dumps(result)
                job.finished_at = datetime.now(timezone.utc)
