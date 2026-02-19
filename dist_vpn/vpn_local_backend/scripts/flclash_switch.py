#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
from urllib import parse, request


def _api_request(url: str, method: str, payload: dict | None, secret: str) -> dict:
    data = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if secret:
        headers["Authorization"] = f"Bearer {secret}"

    req = request.Request(url=url, method=method, data=data, headers=headers)
    with request.urlopen(req, timeout=8.0) as resp:
        raw = resp.read().decode("utf-8", errors="ignore")
    if not raw.strip():
        return {}
    parsed = json.loads(raw)
    return parsed if isinstance(parsed, dict) else {}


def main() -> int:
    if len(sys.argv) < 3:
        print("Usage: flclash_switch.py <selector-group> <target-node>", file=sys.stderr)
        print("Example: flclash_switch.py 'Proxy' 'HK-01'", file=sys.stderr)
        return 2

    group = str(sys.argv[1]).strip()
    target = str(sys.argv[2]).strip()
    controller = str(os.getenv("FLCLASH_CONTROLLER", "http://127.0.0.1:9090")).strip().rstrip("/")
    secret = str(os.getenv("FLCLASH_SECRET", "")).strip()

    if not group or not target:
        print("group/target is empty", file=sys.stderr)
        return 2

    group_enc = parse.quote(group, safe="")
    proxy_url = f"{controller}/proxies/{group_enc}"

    _api_request(proxy_url, "PUT", {"name": target}, secret)
    now_resp = _api_request(proxy_url, "GET", None, secret)
    current = str(now_resp.get("now", "")).strip()

    if current != target:
        print(f"switch failed: expect='{target}' actual='{current}'", file=sys.stderr)
        return 1

    print(f"switched: group='{group}' -> node='{target}'")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
