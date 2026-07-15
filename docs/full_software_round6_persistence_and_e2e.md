# Round 6 Persistence and E2E Notes

Round 6 adds local engineering closure around the existing nine-step simulation:

- SQLite persistence for projects, versions, runs, steps, jobs, artifacts, users, and audit events.
- Local auth modes with default `local_admin` when auth is disabled.
- Persistent run history and replay-based session recovery.
- Lightweight `ThreadPoolExecutor` jobs for step execution.
- Request ID middleware and client error reporting.
- Production FastAPI static serving for `frontend/dist`.
- Local build/run/backup/restore/reset scripts.
- Backend persistence tests, frontend persistence tests, and Playwright Chromium E2E.

Simulation algorithms, default scenario data, technical thresholds, nine-step order, and artifact file names are unchanged.
