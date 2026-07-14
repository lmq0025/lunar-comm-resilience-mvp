"""Thread-safe in-memory simulation session storage."""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from threading import RLock

from lunar_comm_sim.sim.staged_engine import StagedSimulationState, create_staged_state


class SessionNotFoundError(KeyError):
    """Raised when a requested simulation session does not exist."""


class SimulationSessionStore:
    """Small RLock-protected in-memory session store."""

    def __init__(self) -> None:
        self._sessions: dict[str, StagedSimulationState] = {}
        self._session_locks: dict[str, RLock] = {}
        self._lock = RLock()

    def create(self, scenario: dict) -> StagedSimulationState:
        state = create_staged_state(scenario)
        with self._lock:
            self._sessions[state.session_id] = state
            self._session_locks[state.session_id] = RLock()
        return state

    def get(self, session_id: str) -> StagedSimulationState:
        with self._lock:
            state = self._sessions.get(session_id)
            if state is None:
                raise SessionNotFoundError(session_id)
            return state

    def delete(self, session_id: str) -> None:
        with self._lock:
            lock = self._session_locks.get(session_id)
            if lock is None or session_id not in self._sessions:
                raise SessionNotFoundError(session_id)
        with lock:
            with self._lock:
                if session_id not in self._sessions:
                    raise SessionNotFoundError(session_id)
                del self._sessions[session_id]
                del self._session_locks[session_id]

    @contextmanager
    def locked_session(self, session_id: str) -> Iterator[StagedSimulationState]:
        """Yield one session state while holding that session's execution lock."""

        with self._lock:
            state = self._sessions.get(session_id)
            lock = self._session_locks.get(session_id)
            if state is None or lock is None:
                raise SessionNotFoundError(session_id)
        with lock:
            with self._lock:
                if self._sessions.get(session_id) is not state:
                    raise SessionNotFoundError(session_id)
            yield state
