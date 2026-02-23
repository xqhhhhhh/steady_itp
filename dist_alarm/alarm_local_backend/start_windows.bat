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

".venv\Scripts\python.exe" -m pip install -r requirements-alarm.txt
if errorlevel 1 exit /b 1

if not exist "alarm_service.yaml" (
  copy /Y "alarm_service.yaml.template" "alarm_service.yaml" >nul
)

set "ALARM_SERVICE_CONFIG=%cd%\alarm_service.yaml"
".venv\Scripts\python.exe" alarm_service.py
