#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <selector-group> <target-node>" >&2
  echo "Example: $0 'Proxy' 'HK-01'" >&2
  exit 2
fi

GROUP="$1"
TARGET="$2"
CONTROLLER="${FLCLASH_CONTROLLER:-http://127.0.0.1:9090}"
SECRET="${FLCLASH_SECRET:-}"

GROUP_ENC="$(python3 - "$GROUP" <<'PY'
import sys, urllib.parse
print(urllib.parse.quote(sys.argv[1], safe=""))
PY
)"

if [[ -n "$SECRET" ]]; then
  curl -fsS -X PUT \
    -H "Authorization: Bearer ${SECRET}" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${TARGET}\"}" \
    "${CONTROLLER%/}/proxies/${GROUP_ENC}" >/dev/null
  NOW="$(curl -fsS -H "Authorization: Bearer ${SECRET}" "${CONTROLLER%/}/proxies/${GROUP_ENC}" \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("now",""))')"
else
  curl -fsS -X PUT \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${TARGET}\"}" \
    "${CONTROLLER%/}/proxies/${GROUP_ENC}" >/dev/null
  NOW="$(curl -fsS "${CONTROLLER%/}/proxies/${GROUP_ENC}" \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("now",""))')"
fi

if [[ "$NOW" != "$TARGET" ]]; then
  echo "switch failed: expect='${TARGET}' actual='${NOW}'" >&2
  exit 1
fi

echo "switched: group='${GROUP}' -> node='${TARGET}'"
