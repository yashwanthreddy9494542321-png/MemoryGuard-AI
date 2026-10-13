@echo off
title MemoraGuard AI - Frontend Dashboard
echo ========================================================
echo Starting MemoraGuard AI React + Vite UI on port 5173...
echo ========================================================

cd /d "%~dp0"
set "PATH=%CD%\tools\node;%PATH%"
cd frontend
npm run dev
pause
