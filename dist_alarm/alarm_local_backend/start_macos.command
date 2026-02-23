#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

if [[ ! -d ".venv" ]]; then
  python3 -m venv .venv
fi

./.venv/bin/python -m pip install --upgrade pip
./.venv/bin/python -m pip install -r requirements-alarm.txt

if [[ ! -f "alarm_service.yaml" ]]; then
  cp alarm_service.yaml.template alarm_service.yaml
fi

export ALARM_SERVICE_CONFIG="$APP_DIR/alarm_service.yaml"
exec ./.venv/bin/python alarm_service.py
