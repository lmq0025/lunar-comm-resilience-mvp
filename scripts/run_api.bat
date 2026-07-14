@echo off
setlocal
cd /d "%~dp0\.."
python -c "import fastapi, uvicorn, httpx" >nul 2>nul
if errorlevel 1 (
    echo FastAPI backend dependencies are missing.
    echo Run:
    echo python -m pip install -r requirements.txt
    exit /b 1
)
if "%LUNAR_API_PORT%"=="" set "LUNAR_API_PORT=8000"
echo API: http://127.0.0.1:%LUNAR_API_PORT%
echo Swagger: http://127.0.0.1:%LUNAR_API_PORT%/docs
python -m uvicorn lunar_comm_sim.api.main:app --host 127.0.0.1 --port %LUNAR_API_PORT%
