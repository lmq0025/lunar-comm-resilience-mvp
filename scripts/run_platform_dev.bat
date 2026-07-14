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

where node >nul 2>nul
if errorlevel 1 (
    echo Node.js is required for the frontend but was not found.
    echo Install Node.js LTS and reopen this terminal.
    exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
    echo npm is required for the frontend but was not found.
    echo Install Node.js LTS and reopen this terminal.
    exit /b 1
)

if not exist frontend\node_modules (
    echo Frontend dependencies are missing.
    echo Run:
    echo scripts\install_frontend.bat
    exit /b 1
)

if not "%~1"=="" set "LUNAR_API_PORT=%~1"
if "%LUNAR_API_PORT%"=="" set "LUNAR_API_PORT=8000"
if not "%~2"=="" set "LUNAR_FRONTEND_PORT=%~2"
if "%LUNAR_FRONTEND_PORT%"=="" set "LUNAR_FRONTEND_PORT=5173"
set "VITE_API_BASE_URL=http://127.0.0.1:%LUNAR_API_PORT%/api/v1"
echo API: http://127.0.0.1:%LUNAR_API_PORT%
echo Frontend: http://127.0.0.1:%LUNAR_FRONTEND_PORT%
echo Swagger: http://127.0.0.1:%LUNAR_API_PORT%/docs

start "Lunar Comm FastAPI" cmd /k scripts\run_api.bat
start "Lunar Comm React" cmd /k scripts\run_frontend.bat
