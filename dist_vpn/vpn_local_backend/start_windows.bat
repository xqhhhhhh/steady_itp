@echo off
setlocal
cd /d "%~dp0"

set "PY_CMD="
where py >nul 2>&1
if %ERRORLEVEL%==0 set "PY_CMD=py -3"
if not defined PY_CMD (
  where python >nul 2>&1
  if %ERRORLEVEL%==0 set "PY_CMD=python"
)

if not defined PY_CMD (
  echo [ERROR] Python 3.10+ not found.
  echo Please install Python first.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  %PY_CMD% -m venv .venv
  if %ERRORLEVEL% neq 0 goto :error
)

".venv\Scripts\python.exe" -m pip install --upgrade pip >nul
if %ERRORLEVEL% neq 0 goto :error

".venv\Scripts\python.exe" -m pip install -r requirements-vpn.txt
if %ERRORLEVEL% neq 0 goto :error

if not exist "vpn_switch.yaml" (
  copy /Y "vpn_switch.yaml.template" "vpn_switch.yaml" >nul
)

set "VPN_SWITCH_CONFIG=%cd%\vpn_switch.yaml"
set "PYTHONUNBUFFERED=1"

echo [INFO] VPN backend starting at http://127.0.0.1:8000
".venv\Scripts\python.exe" vpn_service.py
exit /b 0

:error
echo [ERROR] Start failed.
pause
exit /b 1
