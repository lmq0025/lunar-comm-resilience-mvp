@echo off
setlocal
if "%LUNAR_APP_DATA_DIR%"=="" (
    set "APP_DATA=%LOCALAPPDATA%\LunarCommMVP"
) else (
    set "APP_DATA=%LUNAR_APP_DATA_DIR%"
)
if "%~1"=="" (
    set "BACKUP_DIR=%CD%\outputs\backups\lunar_comm_backup_%DATE:~0,4%%DATE:~5,2%%DATE:~8,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%"
) else (
    set "BACKUP_DIR=%~1"
)
set "BACKUP_DIR=%BACKUP_DIR: =0%"

if not exist "%APP_DATA%" (
    echo No local app data found: %APP_DATA%
    exit /b 1
)
mkdir "%BACKUP_DIR%" >nul 2>nul
robocopy "%APP_DATA%" "%BACKUP_DIR%" /MIR /XD tmp >nul
if %ERRORLEVEL% GEQ 8 exit /b %ERRORLEVEL%
echo Backup completed: %BACKUP_DIR%
exit /b 0
