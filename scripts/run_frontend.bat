@echo off
setlocal
cd /d "%~dp0\.."

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

if "%LUNAR_FRONTEND_PORT%"=="" set "LUNAR_FRONTEND_PORT=5173"
if "%VITE_API_BASE_URL%"=="" set "VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1"
echo Frontend: http://127.0.0.1:%LUNAR_FRONTEND_PORT%
echo API base: %VITE_API_BASE_URL%
cd frontend
npm.cmd run dev
