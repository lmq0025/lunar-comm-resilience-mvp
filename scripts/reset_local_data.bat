@echo off
setlocal
if "%LUNAR_APP_DATA_DIR%"=="" (
    set "APP_DATA=%LOCALAPPDATA%\LunarCommMVP"
) else (
    set "APP_DATA=%LUNAR_APP_DATA_DIR%"
)
echo This will delete local LunarCommMVP data:
echo %APP_DATA%
set /p CONFIRM=Type YES to continue: 
if not "%CONFIRM%"=="YES" (
    echo Reset cancelled.
    exit /b 1
)
if "%APP_DATA%"=="" exit /b 1
if exist "%APP_DATA%" rmdir /s /q "%APP_DATA%"
echo Local app data reset completed.
