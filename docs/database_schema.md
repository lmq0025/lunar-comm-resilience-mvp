# Local SQLite Database Schema

Round 6 stores local desktop data in SQLite at:

`%LOCALAPPDATA%\LunarCommMVP\lunar_comm_mvp.sqlite3`

Override with `LUNAR_APP_DATA_DIR`.

The backend enables SQLite foreign keys, WAL journal mode, and a 5000 ms busy timeout for every connection.

## Tables

- `users`: local users, roles, active flag, password hash for local auth mode.
- `projects`: current editable project document with scenario/editor JSON and revision.
- `project_versions`: immutable project snapshots created on each formal save.
- `simulation_runs`: persisted run metadata, scenario snapshot, output directory, current step.
- `run_steps`: one stored response per completed run step.
- `jobs`: persistent background job records.
- `artifacts`: generated file manifest rows for completed runs.
- `audit_events`: project/auth/client-error audit trail.

The Alembic initial migration is `0001_initial`.
