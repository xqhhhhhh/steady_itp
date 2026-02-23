from __future__ import annotations

import os
import platform
import subprocess
import threading
import time
from pathlib import Path
from typing import Any

import yaml
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel

app = FastAPI(title="Local Alarm Notify API", version="1.0.0")

LOCAL_HOSTS = {"127.0.0.1", "::1", "localhost"}


class AlarmNotifyRequest(BaseModel):
    event_key: str = ""
    title: str = ""
    text: str = ""
    source_url: str = ""


class AlarmNotifyResponse(BaseModel):
    ok: bool
    message: str = ""
    active: bool = False
    already_running: bool = False


class AlarmStopResponse(BaseModel):
    ok: bool
    message: str = ""
    active: bool = False


def _bool_from_any(raw: Any, default: bool = False) -> bool:
    if isinstance(raw, bool):
        return raw
    text = str(raw if raw is not None else "").strip().lower()
    if not text:
        return default
    return text in {"1", "true", "yes", "y", "on"}


def _resolve_config_path() -> Path:
    raw = os.getenv("ALARM_SERVICE_CONFIG", "").strip()
    if raw:
        return Path(raw)
    return Path(__file__).resolve().parent / "alarm_service.yaml"


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


def _alarm_runtime() -> dict[str, Any]:
    root = _load_yaml_config()
    sec = root.get("alarm")
    if not isinstance(sec, dict):
        sec = {}

    enabled = _bool_from_any(os.getenv("ALARM_ENABLED", sec.get("enabled", True)), True)

    repeat_raw = os.getenv("ALARM_REPEAT_INTERVAL_SEC", "").strip() or sec.get("repeat_interval_sec", 1.5)
    try:
        repeat_interval_sec = float(repeat_raw)
    except Exception:
        repeat_interval_sec = 1.5
    repeat_interval_sec = max(0.3, min(10.0, repeat_interval_sec))

    duration_raw = os.getenv("ALARM_MAX_DURATION_SEC", "").strip() or sec.get("max_duration_sec", 0)
    try:
        max_duration_sec = float(duration_raw)
    except Exception:
        max_duration_sec = 0.0
    max_duration_sec = max(0.0, min(3600.0, max_duration_sec))

    return {
        "enabled": enabled,
        "repeat_interval_sec": repeat_interval_sec,
        "max_duration_sec": max_duration_sec,
    }


def _local_only_enabled() -> bool:
    raw = os.getenv("ALARM_LOCAL_ONLY", "").strip()
    if raw:
        return _bool_from_any(raw, True)
    return _bool_from_any(_server_runtime().get("local_only", True), True)


def _is_local_client(request: Request) -> bool:
    host = ""
    try:
        host = str(request.client.host or "").strip().lower()  # type: ignore[union-attr]
    except Exception:
        host = ""
    return host in LOCAL_HOSTS


def _run_cmd(cmd: list[str], timeout: float = 8.0) -> bool:
    try:
        subprocess.run(
            cmd,
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=timeout,
        )
        return True
    except Exception:
        return False


def _play_alarm_once() -> None:
    system = platform.system().lower()

    if system.startswith("win"):
        try:
            import winsound

            winsound.Beep(1760, 420)
            winsound.Beep(1320, 420)
            winsound.Beep(1760, 420)
            return
        except Exception:
            pass

    if system == "darwin":
        if _run_cmd(["afplay", "/System/Library/Sounds/Sosumi.aiff"]):
            return
        _run_cmd(["say", "Ticket alert"])
        return

    if _run_cmd(["paplay", "/usr/share/sounds/freedesktop/stereo/alarm-clock-elapsed.oga"]):
        return
    if _run_cmd(["aplay", "/usr/share/sounds/alsa/Front_Center.wav"]):
        return

    try:
        print("\a", end="", flush=True)
    except Exception:
        pass


class AlarmController:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self._active = False
        self._last_payload: dict[str, Any] = {}

    def is_active(self) -> bool:
        with self._lock:
            return self._active

    def last_payload(self) -> dict[str, Any]:
        with self._lock:
            return dict(self._last_payload)

    def start(self, payload: AlarmNotifyRequest) -> bool:
        cfg = _alarm_runtime()
        with self._lock:
            self._last_payload = {
                "event_key": str(payload.event_key or ""),
                "title": str(payload.title or ""),
                "text": str(payload.text or ""),
                "source_url": str(payload.source_url or ""),
                "ts": int(time.time() * 1000),
            }
            if self._active:
                return True
            self._active = True
            self._stop_event.clear()
            self._thread = threading.Thread(target=self._run, args=(cfg,), daemon=True)
            self._thread.start()
            return False

    def stop(self) -> bool:
        with self._lock:
            if not self._active:
                return False
            self._stop_event.set()
            t = self._thread

        if t and t.is_alive():
            t.join(timeout=2.0)

        with self._lock:
            self._active = False
            self._thread = None
            self._stop_event.clear()
        return True

    def _run(self, cfg: dict[str, Any]) -> None:
        interval = float(cfg.get("repeat_interval_sec", 1.5) or 1.5)
        max_duration = float(cfg.get("max_duration_sec", 0.0) or 0.0)
        started = time.monotonic()

        try:
            while not self._stop_event.is_set():
                if max_duration > 0 and (time.monotonic() - started) >= max_duration:
                    break

                _play_alarm_once()

                # Small-step sleep so /alarm/stop reacts quickly.
                remaining = interval
                while remaining > 0 and not self._stop_event.is_set():
                    step = 0.1 if remaining > 0.1 else remaining
                    time.sleep(step)
                    remaining -= step
        finally:
            with self._lock:
                self._active = False
                self._thread = None
                self._stop_event.clear()


alarm_controller = AlarmController()


@app.get("/health")
def health() -> dict[str, Any]:
    cfg = _alarm_runtime()
    return {
        "status": "ok",
        "enabled": cfg.get("enabled", True),
        "active": alarm_controller.is_active(),
        "repeat_interval_sec": cfg.get("repeat_interval_sec", 1.5),
        "max_duration_sec": cfg.get("max_duration_sec", 0),
    }


@app.post("/notify/alarm", response_model=AlarmNotifyResponse)
def notify_alarm(payload: AlarmNotifyRequest, request: Request) -> AlarmNotifyResponse:
    if _local_only_enabled() and not _is_local_client(request):
        raise HTTPException(status_code=403, detail="Localhost only")

    cfg = _alarm_runtime()
    if not cfg.get("enabled", True):
        return AlarmNotifyResponse(ok=False, message="alarm.disabled", active=False)

    already_running = alarm_controller.start(payload)
    if already_running:
        return AlarmNotifyResponse(
            ok=True,
            message="alarm.already_running",
            active=True,
            already_running=True,
        )

    return AlarmNotifyResponse(ok=True, message="alarm.started", active=True, already_running=False)


@app.post("/alarm/stop", response_model=AlarmStopResponse)
def stop_alarm(request: Request) -> AlarmStopResponse:
    if _local_only_enabled() and not _is_local_client(request):
        raise HTTPException(status_code=403, detail="Localhost only")

    stopped = alarm_controller.stop()
    return AlarmStopResponse(
        ok=True,
        message="alarm.stopped" if stopped else "alarm.not_running",
        active=False,
    )


if __name__ == "__main__":
    import uvicorn

    server = _server_runtime()
    host = os.getenv("ALARM_BIND_HOST", "").strip() or str(server.get("bind_host", "127.0.0.1"))
    raw_port = os.getenv("ALARM_PORT", "").strip()
    try:
        port = int(raw_port) if raw_port else int(server.get("port", 8002))
    except Exception:
        port = 8002
    reload_enabled = os.getenv("UVICORN_RELOAD", "0").strip() == "1"
    uvicorn.run("alarm_service:app", host=host, port=port, reload=reload_enabled)
