@echo off
echo Stopping existing Python processes...
taskkill /F /IM python.exe 2>nul
timeout /t 2 /nobreak >nul

echo Starting backend...
call .venv\Scripts\activate
python -m uvicorn main:app --reload
