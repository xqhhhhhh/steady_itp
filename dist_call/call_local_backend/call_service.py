from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

import yaml
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel

app = FastAPI(title="Aliyun Call Notify API", version="1.0.0")


class AliyunCallRequest(BaseModel):
    event_key: str = ""
    title: str = ""
    text: str = ""
    called_number: str = ""
    source_url: str = ""


class AliyunCallResponse(BaseModel):
    ok: bool
    message: str = ""
    called_number: str = ""
    request_id: str = ""
    call_id: str = ""


LOCAL_HOSTS = {"127.0.0.1", "::1", "localhost"}


def _bool_from_any(raw: Any, default: bool = False) -> bool:
    if isinstance(raw, bool):
        return raw
    text = str(raw if raw is not None else "").strip().lower()
    if not text:
        return default
    return text in {"1", "true", "yes", "y", "on"}


def _resolve_config_path() -> Path:
    raw = os.getenv("CALL_SERVICE_CONFIG", "").strip()
    if raw:
        return Path(raw)
    return Path(__file__).resolve().parent / "call_service.yaml"


def _load_yaml_config() -> dict[str, Any]:
    path = _resolve_config_path()
    if not path.exists():
        return {}
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def _server_runtime() -> dict[str, Any]:
    root = _load_yaml_config()
    sec = root.get("server")
    if not isinstance(sec, dict):
        sec = {}
    bind_host = str(sec.get("bind_host", "127.0.0.1")).strip() or "127.0.0.1"
    port = sec.get("port", 8002)
    try:
        port_num = int(port)
    except Exception:
        port_num = 8002
    port_num = max(1, min(65535, port_num))
    local_only = _bool_from_any(sec.get("local_only", True), True)
    return {"bind_host": bind_host, "port": port_num, "local_only": local_only}


def _local_only_enabled() -> bool:
    raw = os.getenv("CALL_LOCAL_ONLY", "").strip()
    if raw:
        return _bool_from_any(raw, True)
    return _bool_from_any(_server_runtime().get("local_only", True), True)


def _merge_call_config() -> dict[str, Any]:
    root = _load_yaml_config()
    sec = root.get("aliyun_call")
    if not isinstance(sec, dict):
        sec = {}

    env = os.getenv
    tts_param_json = env("ALIYUN_CALL_TTS_PARAM_JSON", "").strip()
    tts_param = sec.get("tts_param")
    if tts_param_json:
        try:
            parsed = json.loads(tts_param_json)
            if isinstance(parsed, dict):
                tts_param = parsed
        except Exception:
            pass

    play_times = sec.get("play_times", 2)
    try:
        play_times = int(env("ALIYUN_CALL_PLAY_TIMES", str(play_times)).strip() or play_times)
    except Exception:
        play_times = 2
    play_times = max(1, min(3, int(play_times)))

    return {
        "enabled": _bool_from_any(env("ALIYUN_CALL_ENABLED", sec.get("enabled", False)), False),
        "access_key_id": str(
            env("ALIYUN_CALL_ACCESS_KEY_ID", sec.get("access_key_id", ""))
        ).strip(),
        "access_key_secret": str(
            env("ALIYUN_CALL_ACCESS_KEY_SECRET", sec.get("access_key_secret", ""))
        ).strip(),
        "called_show_number": str(
            env("ALIYUN_CALL_CALLED_SHOW_NUMBER", sec.get("called_show_number", ""))
        ).strip(),
        "called_number": str(
            env("ALIYUN_CALL_CALLED_NUMBER", sec.get("called_number", ""))
        ).strip(),
        "tts_code": str(env("ALIYUN_CALL_TTS_CODE", sec.get("tts_code", ""))).strip(),
        "region_id": str(env("ALIYUN_CALL_REGION_ID", sec.get("region_id", "cn-hangzhou"))).strip()
        or "cn-hangzhou",
        "out_id_prefix": str(
            env("ALIYUN_CALL_OUT_ID_PREFIX", sec.get("out_id_prefix", "nolbot"))
        ).strip()
        or "nolbot",
        "play_times": play_times,
        "tts_param": tts_param if isinstance(tts_param, dict) else {},
    }


def _render_template_values(payload: dict[str, Any], mapping: dict[str, str]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for k, v in payload.items():
        if not isinstance(k, str):
            continue
        if isinstance(v, str):
            text = v
            for mk, mv in mapping.items():
                text = text.replace(f"{{{{{mk}}}}}", mv)
                text = text.replace(f"{{{mk}}}", mv)
            out[k] = text
            continue
        out[k] = v
    return out


def _build_tts_param(base_param: dict[str, Any], payload: AliyunCallRequest) -> dict[str, Any]:
    now_text = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    mapping = {
        "title": str(payload.title or "已进入价格页").strip(),
        "text": str(payload.text or "请立即手动确认页面").strip(),
        "event_key": str(payload.event_key or "").strip(),
        "source_url": str(payload.source_url or "").strip(),
        "time": now_text,
    }
    rendered = _render_template_values(base_param, mapping)
    if rendered:
        return rendered
    return {
        "title": mapping["title"][:30],
        "text": mapping["text"][:60],
        "time": mapping["time"],
    }


def _build_out_id(prefix: str, event_key: str) -> str:
    key = str(event_key or "").strip().replace(" ", "_")
    if key:
        return f"{prefix}_{key}"[:64]
    return f"{prefix}_{int(time.time() * 1000)}"[:64]


def _is_local_client(request: Request) -> bool:
    host = ""
    try:
        host = str(request.client.host or "").strip().lower()  # type: ignore[union-attr]
    except Exception:
        host = ""
    return host in LOCAL_HOSTS


def _send_single_call(cfg: dict[str, Any], payload: AliyunCallRequest, called_number: str) -> tuple[bool, dict[str, Any] | str]:
    try:
        from aliyunsdkcore.client import AcsClient
        from aliyunsdkdyvmsapi.request.v20170525.SingleCallByTtsRequest import (
            SingleCallByTtsRequest,
        )
    except Exception as exc:
        return False, f"阿里云语音 SDK 未安装: {exc}"

    try:
        client = AcsClient(
            cfg["access_key_id"],
            cfg["access_key_secret"],
            cfg["region_id"],
        )

        req = SingleCallByTtsRequest()
        req.set_accept_format("json")
        req.set_CalledShowNumber(cfg["called_show_number"])
        req.set_CalledNumber(called_number)
        req.set_TtsCode(cfg["tts_code"])
        req.set_TtsParam(json.dumps(_build_tts_param(cfg.get("tts_param", {}), payload), ensure_ascii=False))
        req.set_PlayTimes(int(cfg.get("play_times", 2)))
        req.set_OutId(_build_out_id(str(cfg.get("out_id_prefix", "nolbot")), payload.event_key))

        raw = client.do_action_with_exception(req)
        body = raw.decode("utf-8", errors="ignore") if isinstance(raw, (bytes, bytearray)) else str(raw)
        data = json.loads(body) if body else {}
        if not isinstance(data, dict):
            return False, "阿里云响应格式异常"

        code = str(data.get("Code") or data.get("code") or "").strip().upper()
        if code and code != "OK":
            msg = str(data.get("Message") or data.get("message") or "unknown_error").strip()
            return False, f"Aliyun call failed: {code} {msg}".strip()

        return True, data
    except Exception as exc:
        return False, f"调用阿里云语音失败: {exc}"


@app.get("/health")
def health() -> dict[str, Any]:
    cfg = _merge_call_config()
    return {
        "status": "ok",
        "enabled": cfg.get("enabled", False),
        "configured": bool(
            cfg.get("access_key_id")
            and cfg.get("access_key_secret")
            and cfg.get("called_show_number")
            and cfg.get("tts_code")
        ),
    }


@app.post("/notify/aliyun-call", response_model=AliyunCallResponse)
def notify_aliyun_call(payload: AliyunCallRequest, request: Request) -> AliyunCallResponse:
    if _local_only_enabled() and not _is_local_client(request):
        raise HTTPException(status_code=403, detail="Localhost only")

    cfg = _merge_call_config()
    if not cfg.get("enabled"):
        return AliyunCallResponse(ok=False, message="aliyun_call.disabled")

    called_number = str(payload.called_number or cfg.get("called_number") or "").strip()
    if not called_number:
        return AliyunCallResponse(ok=False, message="called_number is empty")

    missing = []
    for key in ["access_key_id", "access_key_secret", "called_show_number", "tts_code"]:
        if not str(cfg.get(key, "")).strip():
            missing.append(key)
    if missing:
        return AliyunCallResponse(ok=False, message=f"missing config: {','.join(missing)}")

    ok, data_or_msg = _send_single_call(cfg, payload, called_number)
    if not ok:
        return AliyunCallResponse(ok=False, message=str(data_or_msg), called_number=called_number)

    data = data_or_msg if isinstance(data_or_msg, dict) else {}
    request_id = str(data.get("RequestId") or data.get("request_id") or "").strip()
    call_id = str(data.get("CallId") or data.get("call_id") or "").strip()
    return AliyunCallResponse(
        ok=True,
        message="ok",
        called_number=called_number,
        request_id=request_id,
        call_id=call_id,
    )


if __name__ == "__main__":
    import uvicorn

    server = _server_runtime()
    host = os.getenv("CALL_BIND_HOST", "").strip() or str(server.get("bind_host", "127.0.0.1"))
    raw_port = os.getenv("CALL_PORT", "").strip()
    try:
        port = int(raw_port) if raw_port else int(server.get("port", 8002))
    except Exception:
        port = 8002
    reload_enabled = os.getenv("UVICORN_RELOAD", "0").strip() == "1"
    uvicorn.run("call_service:app", host=host, port=port, reload=reload_enabled)
