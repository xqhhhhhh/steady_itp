@echo off
setlocal ENABLEEXTENSIONS

cd /d "%~dp0"

if not exist ".venv" (
  py -3 -m venv .venv
  if errorlevel 1 (
    echo [ERROR] Failed to create venv. Please install Python 3.10+.
    exit /b 1
  )
)

".venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 exit /b 1

".venv\Scripts\python.exe" -m pip install -r requirements-call.txt
if errorlevel 1 exit /b 1

if not exist "call_service.yaml" (
  copy /Y "call_service.yaml.template" "call_service.yaml" >nul
)

set "CALL_SERVICE_CONFIG=%cd%\call_service.yaml"
".venv\Scripts\python.exe" call_service.py
