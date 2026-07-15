@echo off
setlocal
cd /d "%~dp0\.."

python -c "import fastapi, uvicorn, httpx, sqlalchemy, alembic" >nul 2>nul
if errorlevel 1 (
    echo FastAPI backend dependencies are missing.
    echo Run:
    echo python -m pip install -r requirements.txt
    exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
    echo npm.cmd was not found on PATH.
    exit /b 1
)

echo Installing frontend dependencies from package-lock.json...
cd frontend
call npm.cmd ci
if errorlevel 1 exit /b 1

echo Running frontend typecheck, lint, tests, and production build...
call npm.cmd run typecheck
if errorlevel 1 exit /b 1
call npm.cmd run lint
if errorlevel 1 exit /b 1
call npm.cmd run test
if errorlevel 1 exit /b 1
call npm.cmd run build
if errorlevel 1 exit /b 1

cd ..
echo Checking backend tests...
python -m pytest -q -ra -p no:cacheprovider
if errorlevel 1 exit /b 1

echo Local app build completed.
