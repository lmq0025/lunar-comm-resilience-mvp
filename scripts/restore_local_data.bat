@echo off
setlocal
if "%~1"=="" (
    echo Usage: scripts\restore_local_data.bat ^<backup_directory^>
    exit /b 1
)
if "%LUNAR_APP_DATA_DIR%"=="" (
    set "APP_DATA=%LOCALAPPDATA%\LunarCommMVP"
) else (
    set "APP_DATA=%LUNAR_APP_DATA_DIR%"
)
set "BACKUP_DIR=%~1"
if not exist "%BACKUP_DIR%" (
    echo Backup directory does not exist: %BACKUP_DIR%
    exit /b 1
)
mkdir "%APP_DATA%" >nul 2>nul
robocopy "%BACKUP_DIR%" "%APP_DATA%" /MIR >nul
if %ERRORLEVEL% GEQ 8 exit /b %ERRORLEVEL%
echo Restore completed: %APP_DATA%
exit /b 0
