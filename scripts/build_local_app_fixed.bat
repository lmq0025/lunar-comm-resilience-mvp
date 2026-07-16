@echo off
setlocal
cd /d "%~dp0\.."

rem Use a writable pytest temp directory outside the Windows system Temp folder.
for %%I in ("%CD%\..") do set "LUNAR_WORKSPACE_ROOT=%%~fI"
if defined LUNAR_PYTEST_TEMP_ROOT (
    set "PYTEST_TEMP_ROOT=%LUNAR_PYTEST_TEMP_ROOT%"
) else (
    set "PYTEST_TEMP_ROOT=%LUNAR_WORKSPACE_ROOT%\pytest_temp"
)
set "PYTEST_BASETEMP=%PYTEST_TEMP_ROOT%\build_%RANDOM%_%RANDOM%"
if not exist "%PYTEST_BASETEMP%" mkdir "%PYTEST_BASETEMP%"
if errorlevel 1 (
    echo Failed to create pytest temp directory:
    echo %PYTEST_BASETEMP%
    exit /b 1
)
set "TEMP=%PYTEST_TEMP_ROOT%"
set "TMP=%PYTEST_TEMP_ROOT%"

echo Using pytest temp directory:
echo %PYTEST_BASETEMP%

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
python -m pytest -q -ra -p no:cacheprovider --basetemp "%PYTEST_BASETEMP%"
if errorlevel 1 exit /b 1

echo Local app build completed.
