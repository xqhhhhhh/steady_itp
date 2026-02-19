#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUT_DIR="${1:-$ROOT_DIR/dist/vpn_local_backend}"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR/scripts"

cp "$ROOT_DIR/vpn_service.py" "$OUT_DIR/"
cp "$ROOT_DIR/scripts/flclash_switch.sh" "$OUT_DIR/scripts/"
cp "$ROOT_DIR/scripts/flclash_switch.py" "$OUT_DIR/scripts/"

cp "$SCRIPT_DIR/README.md" "$OUT_DIR/"
cp "$SCRIPT_DIR/requirements-vpn.txt" "$OUT_DIR/"
cp "$SCRIPT_DIR/vpn_switch.yaml.template" "$OUT_DIR/"
cp "$SCRIPT_DIR/start_windows.bat" "$OUT_DIR/"
cp "$SCRIPT_DIR/start_macos.command" "$OUT_DIR/"
cp "$SCRIPT_DIR/start_linux.sh" "$OUT_DIR/"
cp -R "$SCRIPT_DIR/autostart" "$OUT_DIR/"

chmod +x "$OUT_DIR/start_macos.command" "$OUT_DIR/start_linux.sh" "$OUT_DIR/scripts/flclash_switch.sh" "$OUT_DIR/scripts/flclash_switch.py"

echo "VPN local backend release ready: $OUT_DIR"
