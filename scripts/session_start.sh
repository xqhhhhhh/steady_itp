#!/usr/bin/env bash
set -euo pipefail

echo "[1/5] Repo root: $(pwd)"
echo "[2/5] Unfinished features:"
if command -v jq >/dev/null 2>&1; then
  jq -r '.[] | select(.passes==false) | "- \(.name): \(.description)"' feature_list.json
else
  echo "jq not found. Open feature_list.json manually."
fi
echo "[3/5] Run bootstrap checks (if available)"
[ -f package.json ] && npm -s run -q lint || true
[ -f package.json ] && npm -s test || true
echo "[4/5] Read codex-progress.md and pick one unfinished feature"
echo "[5/5] Start implementation"
