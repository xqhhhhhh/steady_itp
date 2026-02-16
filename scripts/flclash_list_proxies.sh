#!/usr/bin/env bash
set -euo pipefail

CONTROLLER="${FLCLASH_CONTROLLER:-http://127.0.0.1:9090}"
SECRET="${FLCLASH_SECRET:-}"

echo "[flclash] controller=${CONTROLLER}"
if [[ -n "$SECRET" ]]; then
  RAW="$(curl -fsS -H "Authorization: Bearer ${SECRET}" "${CONTROLLER%/}/proxies")"
else
  RAW="$(curl -fsS "${CONTROLLER%/}/proxies")"
fi

if command -v jq >/dev/null 2>&1; then
  echo "$RAW" | jq -r '
    .proxies
    | to_entries[]
    | select(.value.type == "Selector" or .value.type == "URLTest" or .value.type == "Fallback")
    | "Group: \(.key)\n  Now: \(.value.now // "-")\n  All: \((.value.all // []) | join(", "))\n"
  '
else
  python3 - "$RAW" <<'PY'
import json, sys
data = json.loads(sys.argv[1]).get("proxies", {})
for name, val in data.items():
    t = str(val.get("type", ""))
    if t not in {"Selector", "URLTest", "Fallback"}:
        continue
    now = val.get("now", "-")
    all_nodes = ", ".join(val.get("all", []))
    print(f"Group: {name}\n  Now: {now}\n  All: {all_nodes}\n")
PY
fi
