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

if not exist "frontend\dist\index.html" (
    echo Frontend production build is missing.
    echo Run:
    echo scripts\build_local_app.bat
    exit /b 1
)

if "%LUNAR_API_PORT%"=="" set "LUNAR_API_PORT=8765"

:check_port
python -c "import socket,sys; s=socket.socket(); rc=s.connect_ex(('127.0.0.1', int(sys.argv[1]))); s.close(); sys.exit(0 if rc else 1)" %LUNAR_API_PORT%
if errorlevel 1 (
    set /a LUNAR_API_PORT+=1
    goto check_port
)

python -c "from lunar_comm_sim.persistence import init_database; init_database()"
if errorlevel 1 exit /b 1

echo Local app: http://127.0.0.1:%LUNAR_API_PORT%
if not "%LUNAR_OPEN_BROWSER%"=="0" start "" "http://127.0.0.1:%LUNAR_API_PORT%"
python -m uvicorn lunar_comm_sim.api.main:app --host 127.0.0.1 --port %LUNAR_API_PORT%
