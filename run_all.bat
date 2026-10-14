@echo off
title MemoraGuard AI - Launcher
echo ========================================================
echo MemoraGuard AI: Launching Full-Stack Services...
echo ========================================================

start "MemoraGuard Backend (8000)" cmd /k "%~dp0run_backend.bat"
timeout /t 5 /nobreak >nul
start "MemoraGuard Frontend (5173)" cmd /k "%~dp0run_frontend.bat"

echo.
echo Services launched!
echo Backend:  http://127.0.0.1:8000 (Docs: http://127.0.0.1:8000/docs)
echo Frontend: http://localhost:5173
echo.
pause
