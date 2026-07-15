"""Alembic environment for the local SQLite schema."""

from __future__ import annotations

from alembic import context

from lunar_comm_sim.persistence.database import get_engine
from lunar_comm_sim.persistence.models import Base

target_metadata = Base.metadata


def run_migrations_online() -> None:
    with get_engine().connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


run_migrations_online()
