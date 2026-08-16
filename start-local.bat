@echo off
setlocal
cd /d "%~dp0"

echo Starting CivicLoop local development services...
if not exist ".venv\Scripts\python.exe" (
  echo Creating Python environment...
  python -m venv .venv
  if errorlevel 1 goto :error
)

echo Installing backend dependencies...
".venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
if errorlevel 1 goto :error

echo Installing frontend dependencies...
call npm install
if errorlevel 1 goto :error

start "CivicLoop API" cmd /k "cd /d "%~dp0" ^&^& .venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000"
start "CivicLoop Frontend" cmd /k "cd /d "%~dp0" ^&^& npm run dev"

echo.
echo CivicLoop is starting in two new windows.
echo Frontend: http://127.0.0.1:5173
echo API docs: http://127.0.0.1:8000/docs
pause
exit /b 0

:error
echo.
echo CivicLoop could not start. Check that Python and Node.js are installed, then run this file again.
pause
exit /b 1
