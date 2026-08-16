$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

if (-not (Test-Path '.venv\Scripts\python.exe')) {
  Write-Host 'Creating the Python environment...'
  python -m venv .venv
}

Write-Host 'Installing backend dependencies...'
& .\.venv\Scripts\python.exe -m pip install -r .\backend\requirements.txt

Write-Host 'Installing frontend dependencies...'
npm install

Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$projectRoot'; & .\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$projectRoot'; npm run dev"

Write-Host ''
Write-Host 'CivicLoop is starting.'
Write-Host 'Frontend: http://127.0.0.1:5173'
Write-Host 'API docs: http://127.0.0.1:8000/docs'
