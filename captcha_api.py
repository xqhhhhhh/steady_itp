from __future__ import annotations

import base64
import math
import os
import shlex
import subprocess
import time
from collections import defaultdict
from pathlib import Path
from typing import Any
from urllib import request as urllib_request
from urllib.error import URLError
from urllib.parse import quote, urlencode

import ddddocr
import yaml
from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel

app = FastAPI(title="Captcha OCR API", version="1.0.0")
ocr = ddddocr.DdddOcr()


class Base64Request(BaseModel):
    image_base64: str


class OcrResponse(BaseModel):
    code: str
    candidates: list[str] = []


class VpnHealthRequest(BaseModel):
    target_url: str = "https://tickets.interpark.com/"
    timeout_ms: int = 5000


class VpnSwitchRequest(BaseModel):
    reason: str = "queue_unhealthy"
    current_queue: int = 0
    source_url: str = ""
    strategy: str = "round_robin"


class VpnSwitchResponse(BaseModel):
    ok: bool
    switched_index: int | None = None
    switched_command: str | None = None
    verify_ok: bool | None = None
    message: str = ""


_DIGIT_TO_LETTER_MAP: dict[str, str] = {
    "0": "O",
    "1": "I",
    "2": "Z",
    "3": "B",
    "4": "A",
    "5": "S",
    "6": "G",
    "7": "T",
    "8": "B",
    "9": "P",
}

_LETTER_CONFUSION_MAP: dict[str, list[str]] = {
    "O": ["Q"],
    "Q": ["O"],
    "G": ["B", "C"],
    "B": ["G"],
    "C": ["G"],
}

_vpn_last_index = -1


def _normalize_to_letters(raw: str) -> str:
    out: list[str] = []
    for ch in (raw or "").strip():
        if ch.isalpha():
            out.append(ch.upper())
            continue
        mapped = _DIGIT_TO_LETTER_MAP.get(ch)
        if mapped:
            out.append(mapped)
    return "".join(out)


def _to_six_letter_windows(raw: str, max_windows: int = 4) -> list[str]:
    letters = _normalize_to_letters(raw)
    if len(letters) < 6:
        return []
    if len(letters) == 6:
        return [letters]

    windows = [letters[:6], letters[-6:]]
    if len(letters) >= 8:
        mid = len(letters) // 2 - 3
        windows.append(letters[max(0, mid) : max(0, mid) + 6])

    out: list[str] = []
    seen: set[str] = set()
    for w in windows:
        if len(w) != 6:
            continue
        if w in seen:
            continue
        seen.add(w)
        out.append(w)
        if len(out) >= max_windows:
            break
    return out


def _expand_letter_confusions(code: str, max_variants: int = 12) -> list[str]:
    text = (code or "").strip().upper()
    if len(text) != 6 or not text.isalpha():
        return []

    out: list[str] = []
    seen: set[str] = {text}
    chars = list(text)

    for i, ch in enumerate(chars):
        swaps = _LETTER_CONFUSION_MAP.get(ch, [])
        for swap in swaps:
            cand = chars[:]
            cand[i] = swap
            s = "".join(cand)
            if s in seen:
                continue
            seen.add(s)
            out.append(s)
            if len(out) >= max_variants:
                return out

    return out[:max_variants]


def _ctc_beam_candidates(
    probability: list[list[float]],
    charsets: list[str],
    top_chars_per_step: int = 6,
    beam_width: int = 40,
    max_candidates: int = 8,
) -> list[str]:
    blank = ""
    beams: dict[tuple[str, str], float] = {("", blank): 0.0}

    for row in probability:
        indexed = sorted(enumerate(row), key=lambda x: x[1], reverse=True)[:top_chars_per_step]
        next_beams: dict[tuple[str, str], float] = defaultdict(lambda: -1e30)
        for (prefix, last_token), score in beams.items():
            for idx, prob in indexed:
                if prob <= 0:
                    continue
                token = charsets[idx]
                if token == blank:
                    next_prefix = prefix
                elif token == last_token:
                    next_prefix = prefix
                else:
                    next_prefix = f"{prefix}{token}"
                new_state = (next_prefix, token)
                new_score = score + math.log(prob)
                if new_score > next_beams[new_state]:
                    next_beams[new_state] = new_score
        beams = dict(sorted(next_beams.items(), key=lambda x: x[1], reverse=True)[:beam_width])

    merged: dict[str, float] = defaultdict(lambda: -1e30)
    for (prefix, _last_token), score in beams.items():
        if score > merged[prefix]:
            merged[prefix] = score

    ranked = [k for k, _ in sorted(merged.items(), key=lambda x: x[1], reverse=True)]
    cleaned = []
    for item in ranked:
        s = item.strip()
        if not s:
            continue
        cleaned.append(s)
        if len(cleaned) >= max_candidates:
            break
    return cleaned


def _ocr_with_candidates(image_bytes: bytes) -> OcrResponse:
    max_total_candidates = 20
    primary_raw = ocr.classification(image_bytes).strip()
    try:
        prob_result: dict[str, Any] = ocr.classification(image_bytes, probability=True)
        beam_candidates = _ctc_beam_candidates(
            probability=prob_result.get("probability", []),
            charsets=prob_result.get("charsets", []),
            max_candidates=8,
        )
    except Exception:
        beam_candidates = []

    merged: list[str] = []
    seen: set[str] = set()
    base_list = [primary_raw, *beam_candidates]
    for item in base_list:
        six_letter_candidates = _to_six_letter_windows(item, max_windows=4)
        for candidate in six_letter_candidates:
            for normalized in [candidate, *_expand_letter_confusions(candidate, 12)]:
                if not normalized or len(normalized) != 6 or not normalized.isalpha():
                    continue
                if normalized in seen:
                    continue
                seen.add(normalized)
                merged.append(normalized)
                if len(merged) >= max_total_candidates:
                    return OcrResponse(code=merged[0], candidates=merged)

    code = merged[0] if merged else ""
    return OcrResponse(code=code, candidates=merged)


def _load_vpn_commands() -> list[str]:
    config_path = os.getenv("VPN_SWITCH_CONFIG", "").strip()
    if config_path:
        loaded = _load_vpn_commands_from_config(Path(config_path))
        if loaded:
            return loaded

    default_path = Path(__file__).resolve().parent / "vpn_switch.yaml"
    loaded = _load_vpn_commands_from_config(default_path)
    if loaded:
        return loaded

    raw = os.getenv("VPN_SWITCH_COMMANDS", "").strip()
    if not raw:
        return []
    parts = [x.strip() for x in raw.split("||")]
    return [x for x in parts if x]


def _resolve_vpn_config_path() -> Path:
    raw = os.getenv("VPN_SWITCH_CONFIG", "").strip()
    if raw:
        return Path(raw)
    return Path(__file__).resolve().parent / "vpn_switch.yaml"


def _load_vpn_config() -> dict[str, Any]:
    path = _resolve_vpn_config_path()
    if not path.exists():
        return {}
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def _load_vpn_commands_from_config(config_path: Path) -> list[str]:
    if not config_path.exists():
        return []

    try:
        data = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
    except Exception:
        return []

    if not isinstance(data, dict):
        return []

    # Highest priority: explicit commands list
    commands = data.get("commands")
    if isinstance(commands, list):
        normalized = [str(x).strip() for x in commands if str(x).strip()]
        if normalized:
            return normalized

    # Convenience mode: define flclash selector + nodes, auto-generate commands
    flclash = data.get("flclash")
    if not isinstance(flclash, dict):
        return []

    selector = str(flclash.get("selector", "")).strip()
    nodes = flclash.get("nodes")
    if not selector or not isinstance(nodes, list):
        return []

    script_path = str(
        flclash.get("switch_script")
        or data.get("switch_script")
        or (Path(__file__).resolve().parent / "scripts" / "flclash_switch.sh")
    ).strip()
    if not script_path:
        return []

    quoted_script = shlex.quote(script_path)
    generated: list[str] = []
    for node in nodes:
        node_text = str(node).strip()
        if not node_text:
            continue
        generated.append(
            f"{quoted_script} {shlex.quote(selector)} {shlex.quote(node_text)}"
        )
    return generated


def _get_flclash_switch_meta(config: dict[str, Any]) -> tuple[str, str, list[str], str, str, str, int]:
    flclash = config.get("flclash")
    if not isinstance(flclash, dict):
        return "", "", [], "", "", "", 0

    selector = str(flclash.get("selector", "")).strip()
    nodes = flclash.get("nodes")
    if not selector or not isinstance(nodes, list):
        return "", "", [], "", "", "", 0
    clean_nodes = [str(x).strip() for x in nodes if str(x).strip()]
    if not clean_nodes:
        return "", "", [], "", "", "", 0

    script_path = str(
        flclash.get("switch_script")
        or config.get("switch_script")
        or (Path(__file__).resolve().parent / "scripts" / "flclash_switch.sh")
    ).strip()
    if not script_path:
        return "", "", [], "", "", "", 0

    controller = str(flclash.get("controller") or os.getenv("CLASH_CONTROLLER", "http://127.0.0.1:9090")).strip()
    secret = str(flclash.get("secret") or os.getenv("CLASH_SECRET", "")).strip()
    delay_url = str(flclash.get("delay_url") or os.getenv("CLASH_DELAY_URL", "https://tickets.interpark.com/")).strip()
    timeout_ms = int(flclash.get("delay_timeout_ms") or os.getenv("CLASH_DELAY_TIMEOUT_MS", "3500"))
    timeout_ms = max(800, min(8000, timeout_ms))
    return script_path, selector, clean_nodes, controller, secret, delay_url, timeout_ms


def _measure_proxy_delay(controller: str, secret: str, node: str, delay_url: str, timeout_ms: int) -> float:
    base = controller.rstrip("/")
    encoded_node = quote(node, safe="")
    query = urlencode({"url": delay_url, "timeout": str(timeout_ms)})
    # Clash Meta/OpenClash commonly supports GET here.
    url = f"{base}/proxies/{encoded_node}/delay?{query}"
    req = urllib_request.Request(url, method="GET")
    req.add_header("Accept", "application/json")
    if secret:
        req.add_header("Authorization", f"Bearer {secret}")
    try:
        with urllib_request.urlopen(req, timeout=max(2.0, timeout_ms / 1000 + 1.5)) as resp:
            raw = resp.read().decode("utf-8", errors="ignore")
        data = yaml.safe_load(raw) if raw else {}
        if not isinstance(data, dict):
            return float("inf")
        delay = data.get("delay")
        if isinstance(delay, (int, float)) and delay > 0:
            return float(delay)
        return float("inf")
    except Exception:
        return float("inf")


def _select_fastest_node_command() -> tuple[str | None, str]:
    config = _load_vpn_config()
    script_path, selector, nodes, controller, secret, delay_url, timeout_ms = _get_flclash_switch_meta(config)
    if not script_path or not selector or not nodes:
        return None, "vpn_switch.yaml 未配置 flclash.selector/nodes"

    best_node = ""
    best_delay = float("inf")
    for node in nodes:
        delay = _measure_proxy_delay(controller, secret, node, delay_url, timeout_ms)
        if delay < best_delay:
            best_delay = delay
            best_node = node

    if not best_node:
        return None, "未能测得可用节点延迟"

    cmd = f"{shlex.quote(script_path)} {shlex.quote(selector)} {shlex.quote(best_node)}"
    return cmd, f"fastest_node={best_node}, delay_ms={int(best_delay)}"


def _run_shell_command(cmd: str, timeout_s: int = 25) -> tuple[bool, str]:
    try:
        done = subprocess.run(
            cmd,
            shell=True,
            timeout=timeout_s,
            capture_output=True,
            text=True,
            check=False,
        )
        out = (done.stdout or done.stderr or "").strip()
        return done.returncode == 0, out[-800:]
    except Exception as exc:
        return False, str(exc)


def _probe_http_health(url: str, timeout_ms: int = 5000) -> tuple[bool, str]:
    target = (url or "").strip() or "https://tickets.interpark.com/"
    timeout_s = max(1.0, min(12.0, timeout_ms / 1000))
    req = urllib_request.Request(
        target,
        headers={"User-Agent": "nol-bot-health/1.0"},
    )
    try:
        with urllib_request.urlopen(req, timeout=timeout_s) as resp:
            code = int(getattr(resp, "status", 200))
            if 200 <= code < 500:
                return True, "ok"
            return False, f"http_{code}"
    except URLError as exc:
        return False, str(exc.reason or exc)
    except Exception as exc:
        return False, str(exc)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/vpn/health")
def vpn_health(payload: VpnHealthRequest) -> dict[str, Any]:
    ok, reason = _probe_http_health(payload.target_url, payload.timeout_ms)
    return {
        "healthy": ok,
        "reason": "ok" if ok else reason,
        "target_url": payload.target_url,
        "ts": int(time.time() * 1000),
    }


@app.post("/vpn/switch", response_model=VpnSwitchResponse)
def vpn_switch(payload: VpnSwitchRequest) -> VpnSwitchResponse:
    global _vpn_last_index
    strategy = str(payload.strategy or "round_robin").strip().lower()
    cmd: str | None = None
    index: int | None = None
    strategy_note = ""

    if strategy == "fastest":
        cmd, strategy_note = _select_fastest_node_command()
        if not cmd:
            strategy_note = f"{strategy_note}; fallback=round_robin"
            commands = _load_vpn_commands()
            if not commands:
                return VpnSwitchResponse(
                    ok=False,
                    message=f"最快节点切换失败: {strategy_note}",
                )
            _vpn_last_index = (_vpn_last_index + 1) % len(commands)
            index = _vpn_last_index
            cmd = commands[_vpn_last_index]
    else:
        commands = _load_vpn_commands()
        if not commands:
            return VpnSwitchResponse(
                ok=False,
                message="VPN 切换未配置，无法自动切换",
            )
        _vpn_last_index = (_vpn_last_index + 1) % len(commands)
        index = _vpn_last_index
        cmd = commands[_vpn_last_index]

    success, output = _run_shell_command(cmd, timeout_s=30)
    if not success:
        return VpnSwitchResponse(
            ok=False,
            switched_index=index,
            switched_command=cmd,
            verify_ok=False,
            message=f"VPN切换命令失败: {output}",
        )

    time.sleep(2.5)
    verify_url = os.getenv("VPN_VERIFY_URL", "https://tickets.interpark.com/")
    verify_ok, verify_reason = _probe_http_health(verify_url, 7000)
    return VpnSwitchResponse(
        ok=True,
        switched_index=index,
        switched_command=cmd,
        verify_ok=verify_ok,
        message=f"已执行切换; verify={verify_reason}; reason={payload.reason}; queue={payload.current_queue}; strategy={strategy}{'; ' + strategy_note if strategy_note else ''}",
    )


@app.post("/ocr/file", response_model=OcrResponse)
async def recognize_from_file(file: UploadFile = File(...)) -> OcrResponse:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are supported")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        result = _ocr_with_candidates(image_bytes)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OCR failed: {exc}") from exc

    return result


@app.post("/ocr/base64", response_model=OcrResponse)
def recognize_from_base64(payload: Base64Request) -> OcrResponse:
    try:
        image_bytes = base64.b64decode(payload.image_base64, validate=True)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid base64 image data") from exc

    if not image_bytes:
        raise HTTPException(status_code=400, detail="Decoded image is empty")

    try:
        result = _ocr_with_candidates(image_bytes)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OCR failed: {exc}") from exc

    return result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("captcha_api:app", host="0.0.0.0", port=8000, reload=True)
