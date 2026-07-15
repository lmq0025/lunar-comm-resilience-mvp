# Local Deployment

Build the local app:

```bat
scripts\build_local_app.bat
```

Run the production local app:

```bat
scripts\run_local_app.bat
```

The production FastAPI process serves both `/api/v1/*` and `frontend/dist`. API routes, `/docs`, and `/openapi.json` remain backend responses; other browser paths fall back to the React app.

The script chooses `LUNAR_API_PORT` or the next available port starting at `8765`.
