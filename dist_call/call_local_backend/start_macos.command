#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

if [[ ! -d ".venv" ]]; then
  python3 -m venv .venv
fi

./.venv/bin/python -m pip install --upgrade pip
./.venv/bin/python -m pip install -r requirements-call.txt

if [[ ! -f "call_service.yaml" ]]; then
  cp call_service.yaml.template call_service.yaml
fi

export CALL_SERVICE_CONFIG="$APP_DIR/call_service.yaml"
exec ./.venv/bin/python call_service.py
