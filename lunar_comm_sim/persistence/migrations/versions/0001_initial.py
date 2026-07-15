"""Initial local persistence schema.

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-15
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("username", sa.String(length=80), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(length=256), nullable=True),
        sa.Column("role", sa.String(length=40), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_username", "users", ["username"])
    op.create_table(
        "projects",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("owner_user_id", sa.String(length=64), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("scenario_json", sa.Text(), nullable=False),
        sa.Column("editor_json", sa.Text(), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("deleted", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_projects_owner_user_id", "projects", ["owner_user_id"])
    op.create_table(
        "project_versions",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("project_id", sa.String(length=64), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("scenario_json", sa.Text(), nullable=False),
        sa.Column("editor_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by_user_id", sa.String(length=64), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.UniqueConstraint("project_id", "revision", name="uq_project_versions_project_revision"),
    )
    op.create_index("ix_project_versions_project_id", "project_versions", ["project_id"])
    op.create_table(
        "simulation_runs",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("session_id", sa.String(length=64), nullable=False, unique=True),
        sa.Column("project_id", sa.String(length=64), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("project_revision", sa.Integer(), nullable=True),
        sa.Column("owner_user_id", sa.String(length=64), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("scenario_name", sa.String(length=200), nullable=True),
        sa.Column("scenario_json", sa.Text(), nullable=False),
        sa.Column("output_dir", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("current_step", sa.String(length=80), nullable=False),
        sa.Column("completed_steps_json", sa.Text(), nullable=False),
        sa.Column("error_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_simulation_runs_owner_user_id", "simulation_runs", ["owner_user_id"])
    op.create_index("ix_simulation_runs_project_id", "simulation_runs", ["project_id"])
    op.create_index("ix_simulation_runs_session_id", "simulation_runs", ["session_id"])
    op.create_table(
        "run_steps",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("run_id", sa.String(length=64), sa.ForeignKey("simulation_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("step_name", sa.String(length=80), nullable=False),
        sa.Column("step_index", sa.Integer(), nullable=False),
        sa.Column("response_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("run_id", "step_name", name="uq_run_steps_run_step"),
    )
    op.create_index("ix_run_steps_run_id", "run_steps", ["run_id"])
    op.create_table(
        "jobs",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("run_id", sa.String(length=64), sa.ForeignKey("simulation_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("step_name", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("cancellation_requested", sa.Boolean(), nullable=False),
        sa.Column("result_json", sa.Text(), nullable=True),
        sa.Column("error_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_jobs_run_id", "jobs", ["run_id"])
    op.create_table(
        "artifacts",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("run_id", sa.String(length=64), sa.ForeignKey("simulation_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("filename", sa.String(length=200), nullable=False),
        sa.Column("relative_path", sa.Text(), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("file_type", sa.String(length=40), nullable=True),
        sa.Column("purpose_zh", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("run_id", "filename", name="uq_artifacts_run_filename"),
    )
    op.create_index("ix_artifacts_run_id", "artifacts", ["run_id"])
    op.create_table(
        "audit_events",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("user_id", sa.String(length=64), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("entity_type", sa.String(length=80), nullable=False),
        sa.Column("entity_id", sa.String(length=80), nullable=True),
        sa.Column("request_id", sa.String(length=80), nullable=True),
        sa.Column("payload_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_events_user_id", "audit_events", ["user_id"])


def downgrade() -> None:
    for table in (
        "audit_events",
        "artifacts",
        "jobs",
        "run_steps",
        "simulation_runs",
        "project_versions",
        "projects",
        "users",
    ):
        op.drop_table(table)
