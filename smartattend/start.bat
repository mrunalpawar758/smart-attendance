@echo off
echo Starting SmartAttend - Frontend and Backend...
set PYTHONIOENCODING=utf-8

npx concurrently --names "FRONTEND,BACKEND" --prefix-colors "cyan.bold,yellow.bold" "npm run dev --prefix frontend" "cd /D backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
