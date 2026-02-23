#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUT_DIR="${1:-$ROOT_DIR/dist_alarm/alarm_local_backend}"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

cp "$ROOT_DIR/alarm_service.py" "$OUT_DIR/"
cp "$SCRIPT_DIR/README.md" "$OUT_DIR/"
cp "$SCRIPT_DIR/requirements-alarm.txt" "$OUT_DIR/"
cp "$SCRIPT_DIR/alarm_service.yaml.template" "$OUT_DIR/"
cp "$SCRIPT_DIR/start_windows.bat" "$OUT_DIR/"
cp "$SCRIPT_DIR/start_macos.command" "$OUT_DIR/"
cp "$SCRIPT_DIR/start_linux.sh" "$OUT_DIR/"

chmod +x "$OUT_DIR/start_macos.command" "$OUT_DIR/start_linux.sh"

echo "Local alarm backend release ready: $OUT_DIR"
