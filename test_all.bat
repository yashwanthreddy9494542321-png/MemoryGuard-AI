@echo off
title MemoraGuard AI - Automated Test Runner
echo ========================================================
echo Running MemoraGuard AI Automated Pytest Suite...
echo ========================================================

cd /d "%~dp0"
python -m pytest tests/ -v
pause
