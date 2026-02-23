#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUT_DIR="${1:-$ROOT_DIR/dist_call/call_local_backend}"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

cp "$ROOT_DIR/call_service.py" "$OUT_DIR/"
cp "$SCRIPT_DIR/README.md" "$OUT_DIR/"
cp "$SCRIPT_DIR/requirements-call.txt" "$OUT_DIR/"
cp "$SCRIPT_DIR/call_service.yaml.template" "$OUT_DIR/"
cp "$SCRIPT_DIR/start_windows.bat" "$OUT_DIR/"
cp "$SCRIPT_DIR/start_macos.command" "$OUT_DIR/"
cp "$SCRIPT_DIR/start_linux.sh" "$OUT_DIR/"

chmod +x "$OUT_DIR/start_macos.command" "$OUT_DIR/start_linux.sh"

echo "Aliyun call local backend release ready: $OUT_DIR"
