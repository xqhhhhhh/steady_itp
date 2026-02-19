#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

if [[ ! -x ".venv/bin/python" ]]; then
  python3 -m venv .venv
fi

./.venv/bin/python -m pip install --upgrade pip >/dev/null
./.venv/bin/python -m pip install -r requirements-vpn.txt

if [[ ! -f "vpn_switch.yaml" ]]; then
  cp vpn_switch.yaml.template vpn_switch.yaml
fi

export VPN_SWITCH_CONFIG="$APP_DIR/vpn_switch.yaml"
export PYTHONUNBUFFERED=1

exec ./.venv/bin/python vpn_service.py
