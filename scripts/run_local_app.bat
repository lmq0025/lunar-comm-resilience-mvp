@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul

for %%I in ("%~dp0\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"

if not exist "frontend\dist\index.html" (
    echo Frontend production build is missing.
    echo Run:
    echo scripts\build_local_app.bat
    exit /b 1
)

if "%LUNAR_APP_DATA_DIR%"=="" (
    for %%I in ("%PROJECT_ROOT%\..\local_app_data") do set "LUNAR_APP_DATA_DIR=%%~fI"
)

set "PYTHON_EXE="
set "USE_CONDA_RUN=0"

if not "%LUNAR_PYTHON_EXE%"=="" if exist "%LUNAR_PYTHON_EXE%" set "PYTHON_EXE=%LUNAR_PYTHON_EXE%"
if "%PYTHON_EXE%"=="" if not "%CONDA_PREFIX%"=="" if exist "%CONDA_PREFIX%\python.exe" set "PYTHON_EXE=%CONDA_PREFIX%\python.exe"
if "%PYTHON_EXE%"=="" if exist "E:\ProgramData\condaData\envs_dirs\lunar_comm_mvp\python.exe" set "PYTHON_EXE=E:\ProgramData\condaData\envs_dirs\lunar_comm_mvp\python.exe"

if "%PYTHON_EXE%"=="" (
    where conda.exe >nul 2>nul
    if not errorlevel 1 set "USE_CONDA_RUN=1"
)

if "%PYTHON_EXE%"=="" if "%USE_CONDA_RUN%"=="0" (
    echo Unable to locate the lunar_comm_mvp Python environment.
    echo Set LUNAR_PYTHON_EXE to the full path of python.exe or install the lunar_comm_mvp Conda environment.
    exit /b 1
)

if "%USE_CONDA_RUN%"=="1" (
    conda.exe run -n lunar_comm_mvp python scripts\prepare_local_app.py
) else (
    "%PYTHON_EXE%" scripts\prepare_local_app.py
)
if errorlevel 1 exit /b 1

set "START_PORT=8765"
if not "%LUNAR_API_PORT%"=="" set "START_PORT=%LUNAR_API_PORT%"

if "%USE_CONDA_RUN%"=="1" (
    for /f "usebackq delims=" %%P in (`conda.exe run -n lunar_comm_mvp python scripts\find_free_port.py %START_PORT%`) do set "FREE_PORT=%%P"
) else (
    for /f "usebackq delims=" %%P in (`"%PYTHON_EXE%" scripts\find_free_port.py %START_PORT%`) do set "FREE_PORT=%%P"
)

if "%FREE_PORT%"=="" (
    echo Failed to find an available local port.
    exit /b 1
)

set "LUNAR_API_PORT=%FREE_PORT%"
echo 正在启动本地应用，端口 %LUNAR_API_PORT% ...

if "%USE_CONDA_RUN%"=="1" (
    conda.exe run -n lunar_comm_mvp python scripts\serve_local_app.py --port %LUNAR_API_PORT%
) else (
    "%PYTHON_EXE%" scripts\serve_local_app.py --port %LUNAR_API_PORT%
)
exit /b %ERRORLEVEL%
