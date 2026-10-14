@echo off
title MemoraGuard AI - Frontend Dashboard
echo ========================================================
echo Starting MemoraGuard AI React + Vite UI on port 5173...
echo ========================================================

cd /d "%~dp0"
call "%~dp0tools\node\nodevars.bat"

if not exist "%~dp0frontend\package.json" (
    echo ERROR: Frontend package.json not found in "%~dp0frontend"
    pause
    exit /b 1
)

cd /d "%~dp0frontend"
where npm >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node/npm was not found. Please ensure the bundled toolchain exists in "%~dp0tools\node"
    pause
    exit /b 1
)

npm install
npm run dev -- --host 0.0.0.0 --port 5173
pause
