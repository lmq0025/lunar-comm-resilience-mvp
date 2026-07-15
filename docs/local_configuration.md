# Local Configuration

Environment variables:

- `LUNAR_APP_DATA_DIR`: overrides the local app data directory.
- `LUNAR_AUTH_MODE`: `disabled` by default; `local` enables username/password endpoints.
- `LUNAR_API_PORT`: backend port for local scripts.
- `LUNAR_FRONTEND_PORT`: frontend dev origin allowed by CORS.
- `LUNAR_OPEN_BROWSER=0`: prevents `run_local_app.bat` from opening a browser.

Default app data path:

`%LOCALAPPDATA%\LunarCommMVP`

Generated run artifacts are stored under the run output directory recorded in `simulation_runs.output_dir`.
