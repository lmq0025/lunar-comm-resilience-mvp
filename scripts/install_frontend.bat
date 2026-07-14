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

if not exist frontend (
    echo frontend directory was not found.
    exit /b 1
)

cd frontend
npm.cmd install
