@echo off
title MemoraGuard AI - Backend Service
echo ========================================================
echo Starting MemoraGuard AI FastAPI Backend on port 8000...
echo ========================================================

cd /d "%~dp0backend"
python init_db.py
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
