from __future__ import annotations

import base64
import hashlib
import hmac
import json
import math
import os
import re
import secrets
import sqlite3
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

import ddddocr
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

app = FastAPI(title="Captcha OCR API", version="3.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
ocr = ddddocr.DdddOcr()


class Base64Request(BaseModel):
    image_base64: str


class OcrResponse(BaseModel):
    code: str
    candidates: list[str] = []


class LicenseActivateRequest(BaseModel):
    activation_code: str
    device_id: str
    client: str = ""


class LicenseActivateResponse(BaseModel):
    ok: bool
    message: str
    device_id: str
    activated_at: int
    license_expires_at: int
    access_token: str
    access_token_expires_at: int


class LicenseAdminCreateRequest(BaseModel):
    codes: list[str]
    plan_days: int = 30
    note: str = ""


class LicenseAdminGenerateRequest(BaseModel):
    count: int = 1
    plan_days: int = 30
    prefix: str = ""
    note: str = ""


class LicenseAdminRevokeRequest(BaseModel):
    activation_code: str


class LicenseConsoleLookupRequest(BaseModel):
    activation_code: str


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

_CODE_RE = re.compile(r"[^A-Za-z0-9]+")
_DEVICE_RE = re.compile(r"^[A-Za-z0-9._:-]{8,128}$")
_MAX_PLAN_DAYS = 3650
_PERMANENT_EXPIRES_AT_MS = 253402300799000  # 9999-12-31T23:59:59Z


# ------------------------------
# License Storage + Token
# ------------------------------


def _now_ms() -> int:
    return int(time.time() * 1000)


def _resolve_license_db_path() -> Path:
    raw = os.getenv("OCR_LICENSE_DB", "").strip()
    if raw:
        return Path(raw)
    return Path(__file__).resolve().parent / "ocr_license.db"


def _connect_db() -> sqlite3.Connection:
    db_path = _resolve_license_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), timeout=5, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _normalize_activation_code(raw: str) -> str:
    code = _CODE_RE.sub("", str(raw or "").strip().upper())
    if len(code) < 8:
        return ""
    return code


def _normalize_device_id(raw: str) -> str:
    device = str(raw or "").strip()
    if not _DEVICE_RE.fullmatch(device):
        return ""
    return device


def _hash_activation_code(normalized_code: str) -> str:
    return hashlib.sha256(normalized_code.encode("utf-8")).hexdigest()


def _normalize_plan_days(raw: Any, fallback: int = 30, allow_permanent: bool = False) -> int:
    try:
        n = int(raw)
    except Exception:
        n = int(fallback)
    if allow_permanent and n == 0:
        return 0
    if n < 1:
        n = int(fallback)
    return max(1, min(_MAX_PLAN_DAYS, n))


def _license_expires_at_ms(now_ms: int, plan_days: int) -> int:
    if int(plan_days) == 0:
        return _PERMANENT_EXPIRES_AT_MS
    return now_ms + int(plan_days) * 24 * 3600 * 1000


def _session_ttl_ms() -> int:
    raw = os.getenv("OCR_SESSION_TTL_SEC", "3600").strip()
    try:
        sec = int(raw)
    except Exception:
        sec = 3600
    sec = max(60, min(24 * 3600, sec))
    return sec * 1000


def _get_session_secret() -> str:
    return (
        os.getenv("OCR_SESSION_SECRET", "").strip()
        or os.getenv("OCR_API_TOKEN", "").strip()
    )


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _b64url_decode(raw: str) -> bytes:
    text = str(raw or "")
    text += "=" * ((4 - len(text) % 4) % 4)
    return base64.urlsafe_b64decode(text.encode("ascii"))


def _sign_access_token(payload: dict[str, Any]) -> str:
    secret = _get_session_secret()
    if not secret:
        raise HTTPException(status_code=503, detail="OCR_SESSION_SECRET is not configured")

    body = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    body_b64 = _b64url_encode(body)
    sig = hmac.new(secret.encode("utf-8"), body_b64.encode("ascii"), hashlib.sha256).digest()
    sig_b64 = _b64url_encode(sig)
    return f"{body_b64}.{sig_b64}"


def _verify_access_token(token: str) -> dict[str, Any] | None:
    raw = str(token or "").strip()
    if "." not in raw:
        return None

    body_b64, sig_b64 = raw.split(".", 1)
    secret = _get_session_secret()
    if not secret:
        return None

    expected_sig = _b64url_encode(
        hmac.new(secret.encode("utf-8"), body_b64.encode("ascii"), hashlib.sha256).digest()
    )
    if not hmac.compare_digest(sig_b64, expected_sig):
        return None

    try:
        payload = json.loads(_b64url_decode(body_b64).decode("utf-8"))
    except Exception:
        return None

    exp = int(payload.get("exp") or 0)
    if exp <= _now_ms():
        return None
    return payload


def _extract_bearer_token(authorization: str) -> str:
    raw = str(authorization or "").strip()
    if not raw:
        return ""
    head, _, tail = raw.partition(" ")
    if head.lower() != "bearer":
        return ""
    return tail.strip()


def _init_license_db() -> None:
    with _connect_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS activation_codes (
                code_hash TEXT PRIMARY KEY,
                code_last4 TEXT NOT NULL,
                plan_days INTEGER NOT NULL DEFAULT 30,
                status TEXT NOT NULL DEFAULT 'NEW',
                bound_device_id TEXT,
                activated_at_ms INTEGER,
                expires_at_ms INTEGER,
                revoked INTEGER NOT NULL DEFAULT 0,
                note TEXT NOT NULL DEFAULT '',
                created_at_ms INTEGER NOT NULL
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_activation_codes_status ON activation_codes(status)"
        )


def _upsert_license_code(raw_code: str, plan_days: int, note: str = "") -> bool:
    normalized = _normalize_activation_code(raw_code)
    if not normalized:
        return False

    plan = _normalize_plan_days(plan_days, fallback=30, allow_permanent=True)
    code_hash = _hash_activation_code(normalized)
    with _connect_db() as conn:
        cur = conn.execute("SELECT code_hash FROM activation_codes WHERE code_hash = ?", (code_hash,))
        if cur.fetchone():
            return False
        conn.execute(
            """
            INSERT INTO activation_codes (
                code_hash, code_last4, plan_days, status, revoked, note, created_at_ms
            ) VALUES (?, ?, ?, 'NEW', 0, ?, ?)
            """,
            (code_hash, normalized[-4:], plan, str(note or ""), _now_ms()),
        )
    return True


def _seed_bootstrap_codes() -> None:
    raw = (
        os.getenv("OCR_LICENSE_BOOTSTRAP_CODES", "").strip()
        or os.getenv("OCR_BOOTSTRAP_CODES", "").strip()
    )
    if not raw:
        return

    chunks = re.split(r"[,\n]+", raw)
    for chunk in chunks:
        item = str(chunk or "").strip()
        if not item:
            continue

        code = item
        plan_days = 30
        if ":" in item:
            left, right = item.split(":", 1)
            code = left.strip()
            try:
                plan_days = int(right.strip())
            except Exception:
                plan_days = 30
        _upsert_license_code(code, plan_days, note="bootstrap")


def _issue_license_token(code_hash: str, device_id: str, license_expires_at: int) -> tuple[str, int]:
    now = _now_ms()
    token_exp = min(license_expires_at, now + _session_ttl_ms())
    payload = {
        "ver": 1,
        "code_hash": code_hash,
        "device_id": device_id,
        "exp": token_exp,
    }
    token = _sign_access_token(payload)
    return token, token_exp


def _require_admin_auth(
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> None:
    expected = os.getenv("OCR_ADMIN_TOKEN", "").strip()
    if not expected:
        raise HTTPException(status_code=503, detail="OCR_ADMIN_TOKEN is not configured")

    supplied = _extract_bearer_token(authorization or "")
    if not supplied:
        supplied = str(x_admin_token or "").strip()
    if not supplied or not hmac.compare_digest(supplied, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


def _get_console_key() -> str:
    return (
        os.getenv("OCR_CONSOLE_KEY", "").strip()
        or os.getenv("OCR_ADMIN_TOKEN", "").strip()
    )


def _require_console_auth(
    authorization: str | None = Header(default=None),
    x_console_key: str | None = Header(default=None),
) -> None:
    expected = _get_console_key()
    if not expected:
        raise HTTPException(status_code=503, detail="OCR_CONSOLE_KEY is not configured")

    supplied = _extract_bearer_token(authorization or "")
    if not supplied:
        supplied = str(x_console_key or "").strip()
    if not supplied or not hmac.compare_digest(supplied, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


def _validate_license_session(payload: dict[str, Any]) -> bool:
    code_hash = str(payload.get("code_hash") or "").strip()
    device_id = str(payload.get("device_id") or "").strip()
    if not code_hash or not device_id:
        return False

    with _connect_db() as conn:
        cur = conn.execute(
            "SELECT bound_device_id, expires_at_ms, revoked FROM activation_codes WHERE code_hash = ?",
            (code_hash,),
        )
        row = cur.fetchone()
    if not row:
        return False
    if int(row["revoked"] or 0) != 0:
        return False
    if str(row["bound_device_id"] or "") != device_id:
        return False
    expires_at = int(row["expires_at_ms"] or 0)
    if expires_at <= _now_ms():
        return False
    return True


def _require_ocr_auth(
    authorization: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
    x_ocr_token: str | None = Header(default=None),
) -> None:
    supplied = _extract_bearer_token(authorization or "")
    if not supplied:
        supplied = str(x_ocr_token or x_api_key or "").strip()

    expected_static = os.getenv("OCR_API_TOKEN", "").strip()
    if expected_static and supplied and hmac.compare_digest(supplied, expected_static):
        return

    payload = _verify_access_token(supplied)
    if not payload or not _validate_license_session(payload):
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.on_event("startup")
def _on_startup() -> None:
    _init_license_db()
    _seed_bootstrap_codes()


# ------------------------------
# OCR Logic
# ------------------------------


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


# ------------------------------
# Public APIs
# ------------------------------


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/license/activate", response_model=LicenseActivateResponse)
def license_activate(payload: LicenseActivateRequest) -> LicenseActivateResponse:
    normalized_code = _normalize_activation_code(payload.activation_code)
    if not normalized_code:
        raise HTTPException(status_code=400, detail="激活码格式无效")

    device_id = _normalize_device_id(payload.device_id)
    if not device_id:
        raise HTTPException(status_code=400, detail="设备标识格式无效")

    code_hash = _hash_activation_code(normalized_code)
    now = _now_ms()

    with _connect_db() as conn:
        cur = conn.execute(
            """
            SELECT code_hash, plan_days, status, bound_device_id,
                   activated_at_ms, expires_at_ms, revoked
            FROM activation_codes
            WHERE code_hash = ?
            """,
            (code_hash,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="激活码不存在")

        if int(row["revoked"] or 0) != 0:
            raise HTTPException(status_code=403, detail="激活码已失效")

        bound_device_id = str(row["bound_device_id"] or "")
        activated_at = int(row["activated_at_ms"] or 0)
        expires_at = int(row["expires_at_ms"] or 0)
        status = str(row["status"] or "NEW").upper()
        plan_days = _normalize_plan_days(row["plan_days"], fallback=30, allow_permanent=True)

        if activated_at and bound_device_id and bound_device_id != device_id:
            raise HTTPException(status_code=403, detail="激活码已绑定其他设备")

        if not activated_at:
            activated_at = now
            expires_at = _license_expires_at_ms(now, plan_days)
            status = "ACTIVE"
            conn.execute(
                """
                UPDATE activation_codes
                SET status = 'ACTIVE', bound_device_id = ?, activated_at_ms = ?, expires_at_ms = ?
                WHERE code_hash = ?
                """,
                (device_id, activated_at, expires_at, code_hash),
            )
        elif not bound_device_id:
            conn.execute(
                "UPDATE activation_codes SET bound_device_id = ? WHERE code_hash = ?",
                (device_id, code_hash),
            )

        if expires_at <= now:
            conn.execute(
                "UPDATE activation_codes SET status = 'EXPIRED' WHERE code_hash = ?",
                (code_hash,),
            )
            raise HTTPException(status_code=403, detail="订阅已到期")

        if status != "ACTIVE":
            conn.execute(
                "UPDATE activation_codes SET status = 'ACTIVE' WHERE code_hash = ?",
                (code_hash,),
            )

    access_token, access_token_exp = _issue_license_token(code_hash, device_id, expires_at)
    message = "activated" if activated_at == now else "already_active"
    return LicenseActivateResponse(
        ok=True,
        message=message,
        device_id=device_id,
        activated_at=activated_at,
        license_expires_at=expires_at,
        access_token=access_token,
        access_token_expires_at=access_token_exp,
    )


@app.post("/license/admin/create")
def license_admin_create(
    payload: LicenseAdminCreateRequest,
    _auth: None = Depends(_require_admin_auth),
) -> dict[str, Any]:
    codes = payload.codes or []
    if not codes:
        raise HTTPException(status_code=400, detail="codes is empty")

    created = 0
    skipped = 0
    for code in codes:
        ok = _upsert_license_code(str(code or ""), payload.plan_days, note=payload.note)
        if ok:
            created += 1
        else:
            skipped += 1

    return {
        "ok": True,
        "created": created,
        "skipped": skipped,
        "plan_days": _normalize_plan_days(payload.plan_days, fallback=30, allow_permanent=True),
    }


@app.post("/license/admin/generate")
def license_admin_generate(
    payload: LicenseAdminGenerateRequest,
    _auth: None = Depends(_require_admin_auth),
) -> dict[str, Any]:
    count = max(1, min(200, int(payload.count or 1)))
    plan_days = _normalize_plan_days(payload.plan_days, fallback=30, allow_permanent=True)
    prefix = _CODE_RE.sub("", str(payload.prefix or "").upper())[:8]

    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    created_codes: list[str] = []
    attempts = 0

    while len(created_codes) < count and attempts < count * 20:
        attempts += 1
        body = "".join(secrets.choice(alphabet) for _ in range(16))
        chunks = [body[i : i + 4] for i in range(0, 16, 4)]
        candidate = "-".join(chunks)
        if prefix:
            candidate = f"{prefix}-{candidate}"
        if _upsert_license_code(candidate, plan_days, note=payload.note):
            created_codes.append(candidate)

    if len(created_codes) < count:
        raise HTTPException(status_code=500, detail="生成激活码失败，请重试")

    return {"ok": True, "codes": created_codes, "plan_days": plan_days}


@app.post("/license/admin/revoke")
def license_admin_revoke(
    payload: LicenseAdminRevokeRequest,
    _auth: None = Depends(_require_admin_auth),
) -> dict[str, Any]:
    normalized_code = _normalize_activation_code(payload.activation_code)
    if not normalized_code:
        raise HTTPException(status_code=400, detail="激活码格式无效")
    code_hash = _hash_activation_code(normalized_code)

    with _connect_db() as conn:
        cur = conn.execute("SELECT code_hash FROM activation_codes WHERE code_hash = ?", (code_hash,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="激活码不存在")
        conn.execute(
            "UPDATE activation_codes SET revoked = 1, status = 'REVOKED' WHERE code_hash = ?",
            (code_hash,),
        )

    return {"ok": True, "message": "revoked"}


def _mask_device_id(device_id: str) -> str:
    raw = str(device_id or "").strip()
    if not raw:
        return ""
    if len(raw) <= 8:
        return raw
    return f"{raw[:4]}***{raw[-4:]}"


_PLAN_BY_EXPORT_FILE: dict[str, int] = {
    "codes_permanent.txt": 0,
    "codes_1_year.txt": 365,
    "codes_half_year.txt": 180,
    "codes_1_month.txt": 30,
}


def _resolve_license_export_root() -> Path:
    raw = os.getenv("OCR_LICENSE_EXPORT_ROOT", "").strip()
    if raw:
        return Path(raw)
    return Path("/opt/nol-ocr/license_exports")


def _latest_export_dir() -> Path:
    root = _resolve_license_export_root()
    if not root.exists():
        raise HTTPException(status_code=404, detail="激活码导出目录不存在")
    dirs = sorted([p for p in root.iterdir() if p.is_dir()], key=lambda p: p.name, reverse=True)
    if not dirs:
        raise HTTPException(status_code=404, detail="未找到激活码批次目录")
    return dirs[0]


def _iter_export_codes(export_dir: Path, plan_days: int | None = None) -> list[tuple[str, int]]:
    out: list[tuple[str, int]] = []
    for filename, file_plan in _PLAN_BY_EXPORT_FILE.items():
        if plan_days is not None and int(plan_days) != file_plan:
            continue
        path = export_dir / filename
        if not path.exists() or not path.is_file():
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except Exception:
            continue
        for line in content.splitlines():
            code = str(line or "").strip()
            if not code:
                continue
            out.append((code, file_plan))
    return out


def _db_rows_by_code_hashes(code_hashes: list[str]) -> dict[str, sqlite3.Row]:
    if not code_hashes:
        return {}
    unique_hashes = list(dict.fromkeys(code_hashes))
    out: dict[str, sqlite3.Row] = {}
    chunk_size = 800
    with _connect_db() as conn:
        for i in range(0, len(unique_hashes), chunk_size):
            part = unique_hashes[i : i + chunk_size]
            placeholders = ",".join(["?"] * len(part))
            cur = conn.execute(
                f"""
                SELECT code_hash, plan_days, status, bound_device_id,
                       activated_at_ms, expires_at_ms, revoked, note, created_at_ms
                FROM activation_codes
                WHERE code_hash IN ({placeholders})
                """,
                tuple(part),
            )
            for row in cur.fetchall():
                out[str(row["code_hash"])] = row
    return out


@app.get("/console", response_class=HTMLResponse)
def console_page() -> str:
    return """
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>OCR 激活码控制台</title>
    <style>
      :root {
        --bg: #f5f7fb;
        --card: #ffffff;
        --text: #162033;
        --muted: #5b6473;
        --border: #dde3ef;
        --primary: #1d4ed8;
        --ok: #157347;
        --warn: #b45309;
        --danger: #b91c1c;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 14px;
        background: var(--bg);
        color: var(--text);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .wrap {
        max-width: 860px;
        margin: 0 auto;
        display: grid;
        gap: 12px;
      }
      .card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 12px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 18px;
      }
      h2 {
        margin: 0 0 8px;
        font-size: 14px;
      }
      .row {
        display: grid;
        grid-template-columns: 1fr auto auto;
        gap: 8px;
      }
      input, button, select {
        border-radius: 8px;
        border: 1px solid var(--border);
        font-size: 14px;
        padding: 9px 10px;
      }
      button {
        border: 0;
        background: var(--primary);
        color: #fff;
        font-weight: 600;
      }
      button.secondary {
        background: #475569;
      }
      button:disabled {
        opacity: 0.6;
      }
      .hint {
        margin-top: 6px;
        font-size: 12px;
        color: var(--muted);
      }
      .status {
        margin-top: 6px;
        font-size: 12px;
      }
      .status.ok { color: var(--ok); }
      .status.warn { color: var(--warn); }
      .status.err { color: var(--danger); }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }
      .metric {
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 10px;
        background: #f9fbff;
      }
      .metric .k {
        font-size: 12px;
        color: var(--muted);
      }
      .metric .v {
        font-size: 20px;
        font-weight: 700;
        margin-top: 2px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        border-bottom: 1px solid var(--border);
        text-align: left;
        font-size: 13px;
        padding: 8px 4px;
      }
      .kv {
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 8px;
        font-size: 13px;
      }
      .kv div {
        padding: 6px 0;
        border-bottom: 1px solid var(--border);
      }
      @media (max-width: 640px) {
        .row {
          grid-template-columns: 1fr;
        }
        .grid {
          grid-template-columns: 1fr 1fr;
        }
        .kv {
          grid-template-columns: 92px 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <section class="card">
        <h1>OCR 激活码控制台</h1>
        <div class="row">
          <input id="consoleKey" type="password" placeholder="请输入登录密钥" />
          <button id="loginBtn" type="button">登录</button>
          <button id="logoutBtn" class="secondary" type="button">退出</button>
        </div>
        <div id="authStatus" class="status warn">未登录</div>
        <div class="hint">页面地址可直接在手机打开。登录后可查看库存、可发码列表与单码状态。</div>
      </section>

      <section class="card">
        <h2>库存统计</h2>
        <div class="grid">
          <div class="metric"><div class="k">总激活码</div><div id="mTotal" class="v">-</div></div>
          <div class="metric"><div class="k">可用 (NEW)</div><div id="mNew" class="v">-</div></div>
          <div class="metric"><div class="k">已激活 (ACTIVE)</div><div id="mActive" class="v">-</div></div>
          <div class="metric"><div class="k">已失效/撤销</div><div id="mInvalid" class="v">-</div></div>
        </div>
        <div style="margin-top:10px; overflow:auto;">
          <table>
            <thead><tr><th>订阅天数</th><th>可用数量</th></tr></thead>
            <tbody id="planBody"></tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <h2>激活码列表</h2>
        <div class="row" style="grid-template-columns: 130px 130px 1fr auto;">
          <select id="availStatusFilter">
            <option value="NEW">可用 (NEW)</option>
            <option value="ACTIVE">已激活 (ACTIVE)</option>
            <option value="EXPIRED">已失效 (EXPIRED)</option>
            <option value="REVOKED">已撤销 (REVOKED)</option>
            <option value="ALL">全部状态</option>
          </select>
          <select id="availPlan">
            <option value="all">全部期限</option>
            <option value="0">永久</option>
            <option value="30">1个月</option>
            <option value="180">半年</option>
            <option value="365">1年</option>
          </select>
          <input id="availKeyword" type="text" placeholder="按激活码关键字筛选 (可选)" />
          <button id="availSearchBtn" type="button">查询</button>
        </div>
        <div class="row" style="grid-template-columns: auto auto 1fr;">
          <button id="availPrevBtn" class="secondary" type="button">上一页</button>
          <button id="availNextBtn" class="secondary" type="button">下一页</button>
          <div id="availStatus" class="status warn" style="margin: 0; align-self: center;">未查询</div>
        </div>
        <div style="margin-top:10px; overflow:auto;">
          <table>
            <thead><tr><th>激活码</th><th>状态</th><th>订阅</th><th>激活时间</th><th>到期时间</th><th>操作</th></tr></thead>
            <tbody id="availBody"></tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <h2>激活码查询</h2>
        <div class="row" style="grid-template-columns: 1fr auto;">
          <input id="lookupCode" type="text" placeholder="输入完整激活码，如 PERM-XXXX-XXXX-XXXX-XXXX" />
          <button id="lookupBtn" type="button">查询</button>
        </div>
        <div id="lookupStatus" class="status warn">请输入激活码后查询</div>
        <div id="lookupDetail" class="kv"></div>
      </section>
    </div>

    <script>
      const KEY_STORE = "ocr_console_key";
      const $ = (id) => document.getElementById(id);
      const AVAIL_PAGE_SIZE = 20;
      let availPage = 1;
      let availTotalPages = 1;

      const fmtTime = (ts) => {
        const n = Number(ts || 0);
        if (!Number.isFinite(n) || n <= 0) return "-";
        return new Date(n).toLocaleString();
      };

      const key = () => String(sessionStorage.getItem(KEY_STORE) || "").trim();

      const headers = () => {
        const k = key();
        if (!k) return {};
        return { "X-Console-Key": k };
      };

      function setAuthStatus(text, cls = "warn") {
        const el = $("authStatus");
        el.textContent = text;
        el.className = `status ${cls}`;
      }

      function setLookupStatus(text, cls = "warn") {
        const el = $("lookupStatus");
        el.textContent = text;
        el.className = `status ${cls}`;
      }

      function setAvailStatus(text, cls = "warn") {
        const el = $("availStatus");
        el.textContent = text;
        el.className = `status ${cls}`;
      }

      async function fetchSummary() {
        const resp = await fetch("./console/api/summary", { headers: headers() });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.json();
      }

      async function fetchLookup(code) {
        const resp = await fetch("./console/api/code", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers() },
          body: JSON.stringify({ activation_code: code })
        });
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(txt || `HTTP ${resp.status}`);
        }
        return resp.json();
      }

      async function fetchAvailableCodes() {
        const statusFilter = $("availStatusFilter").value;
        const plan = $("availPlan").value;
        const keyword = $("availKeyword").value.trim();
        const params = new URLSearchParams();
        if (statusFilter) params.set("status", statusFilter);
        if (plan !== "all") params.set("plan_days", plan);
        if (keyword) params.set("keyword", keyword);
        params.set("page", String(availPage));
        params.set("page_size", String(AVAIL_PAGE_SIZE));
        const resp = await fetch(`./console/api/available-codes?${params.toString()}`, {
          headers: headers()
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.json();
      }

      async function refreshSummary() {
        const data = await fetchSummary();
        $("mTotal").textContent = String(data.total || 0);
        $("mNew").textContent = String(data.status_counts?.NEW || 0);
        $("mActive").textContent = String(data.status_counts?.ACTIVE || 0);
        const invalid = Number(data.status_counts?.EXPIRED || 0) + Number(data.status_counts?.REVOKED || 0);
        $("mInvalid").textContent = String(invalid);

        const rows = Object.entries(data.new_by_plan_days || {})
          .map(([k, v]) => ({ days: Number(k), count: Number(v) }))
          .sort((a, b) => a.days - b.days);
        const body = $("planBody");
        body.innerHTML = "";
        for (const row of rows) {
          const tr = document.createElement("tr");
          const label = row.days === 0 ? "永久" : `${row.days} 天`;
          tr.innerHTML = `<td>${label}</td><td>${row.count}</td>`;
          body.appendChild(tr);
        }
      }

      function renderLookup(data) {
        const info = data?.code_info || {};
        const wrap = $("lookupDetail");
        const rows = [
          ["状态", info.status || "-"],
          ["订阅", Number(info.plan_days) === 0 ? "永久" : `${info.plan_days || "-"} 天`],
          ["设备", info.bound_device_id_masked || "-"],
          ["激活时间", fmtTime(info.activated_at_ms)],
          ["到期时间", Number(info.plan_days) === 0 ? "永久" : fmtTime(info.expires_at_ms)],
          ["撤销", info.revoked ? "是" : "否"],
          ["备注", info.note || "-"]
        ];
        wrap.innerHTML = rows.map(([k, v]) => `<div>${k}</div><div>${v}</div>`).join("");
      }

      async function copyText(text) {
        const t = String(text || "").trim();
        if (!t) return false;
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(t);
            return true;
          }
        } catch (_) {}
        try {
          const ta = document.createElement("textarea");
          ta.value = t;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          const ok = document.execCommand("copy");
          document.body.removeChild(ta);
          return ok;
        } catch (_) {
          return false;
        }
      }

      async function refreshAvailableCodes(resetPage = false) {
        if (resetPage) availPage = 1;
        try {
          const data = await fetchAvailableCodes();
          const items = Array.isArray(data.items) ? data.items : [];
          const total = Number(data.total || 0);
          availTotalPages = Math.max(1, Math.ceil(total / AVAIL_PAGE_SIZE));
          const body = $("availBody");
          body.innerHTML = "";
          for (const item of items) {
            const tr = document.createElement("tr");
            const planLabel = Number(item.plan_days) === 0 ? "永久" : `${item.plan_days} 天`;
            const statusLabel = item.status || "-";
            const activatedAt = fmtTime(item.activated_at_ms);
            const expiresAt = Number(item.plan_days) === 0 ? "永久" : fmtTime(item.expires_at_ms);
            tr.innerHTML = `
              <td><code>${item.code}</code></td>
              <td>${statusLabel}</td>
              <td>${planLabel}</td>
              <td>${activatedAt}</td>
              <td>${expiresAt}</td>
              <td><button class="secondary" type="button" data-code="${item.code}">复制</button></td>
            `;
            body.appendChild(tr);
          }
          if (!items.length) {
            const tr = document.createElement("tr");
            tr.innerHTML = '<td colspan="6">暂无符合条件的激活码</td>';
            body.appendChild(tr);
          }
          for (const btn of Array.from(document.querySelectorAll("button[data-code]"))) {
            btn.addEventListener("click", async () => {
              const code = btn.getAttribute("data-code") || "";
              const ok = await copyText(code);
              setAvailStatus(ok ? "已复制激活码" : "复制失败，请手动复制", ok ? "ok" : "err");
            });
          }
          $("availPrevBtn").disabled = availPage <= 1;
          $("availNextBtn").disabled = availPage >= availTotalPages;
          const selectedStatus = $("availStatusFilter").value || "NEW";
          setAvailStatus(
            `批次 ${data.batch || "-"} | 状态 ${selectedStatus} | 第 ${availPage}/${availTotalPages} 页 | 共 ${total} 条`,
            "ok"
          );
        } catch (err) {
          $("availBody").innerHTML = "";
          setAvailStatus(`加载失败: ${String(err.message || err)}`, "err");
        }
      }

      async function doLogin() {
        const v = $("consoleKey").value.trim();
        if (!v) {
          setAuthStatus("请输入登录密钥", "warn");
          return;
        }
        sessionStorage.setItem(KEY_STORE, v);
        try {
          await Promise.all([refreshSummary(), refreshAvailableCodes(true)]);
          setAuthStatus("已登录", "ok");
        } catch (err) {
          sessionStorage.removeItem(KEY_STORE);
          setAuthStatus(`登录失败: ${String(err.message || err)}`, "err");
        }
      }

      function doLogout() {
        sessionStorage.removeItem(KEY_STORE);
        setAuthStatus("已退出", "warn");
        $("availBody").innerHTML = "";
        setAvailStatus("未查询", "warn");
      }

      async function doLookup() {
        const code = $("lookupCode").value.trim();
        if (!code) {
          setLookupStatus("请输入激活码", "warn");
          return;
        }
        try {
          const data = await fetchLookup(code);
          renderLookup(data);
          setLookupStatus("查询成功", "ok");
        } catch (err) {
          $("lookupDetail").innerHTML = "";
          setLookupStatus(`查询失败: ${String(err.message || err)}`, "err");
        }
      }

      $("loginBtn").addEventListener("click", doLogin);
      $("logoutBtn").addEventListener("click", doLogout);
      $("lookupBtn").addEventListener("click", doLookup);
      $("availSearchBtn").addEventListener("click", () => {
        refreshAvailableCodes(true);
      });
      $("availStatusFilter").addEventListener("change", () => {
        refreshAvailableCodes(true);
      });
      $("availPlan").addEventListener("change", () => {
        refreshAvailableCodes(true);
      });
      $("availPrevBtn").addEventListener("click", () => {
        if (availPage <= 1) return;
        availPage -= 1;
        refreshAvailableCodes(false);
      });
      $("availNextBtn").addEventListener("click", () => {
        if (availPage >= availTotalPages) return;
        availPage += 1;
        refreshAvailableCodes(false);
      });

      if (key()) {
        Promise.all([refreshSummary(), refreshAvailableCodes(true)])
          .then(() => setAuthStatus("已登录", "ok"))
          .catch((err) => {
            sessionStorage.removeItem(KEY_STORE);
            setAuthStatus(`登录失效: ${String(err.message || err)}`, "err");
          });
      }
    </script>
  </body>
</html>
"""


@app.get("/console/api/summary")
def console_summary(
    _auth: None = Depends(_require_console_auth),
) -> dict[str, Any]:
    with _connect_db() as conn:
        status_rows = conn.execute(
            "SELECT status, COUNT(*) AS c FROM activation_codes GROUP BY status"
        ).fetchall()
        plan_rows = conn.execute(
            """
            SELECT plan_days, COUNT(*) AS c
            FROM activation_codes
            WHERE status = 'NEW' AND revoked = 0
            GROUP BY plan_days
            ORDER BY plan_days
            """
        ).fetchall()
        total = conn.execute("SELECT COUNT(*) AS c FROM activation_codes").fetchone()

    status_counts = {str(r["status"] or "UNKNOWN").upper(): int(r["c"] or 0) for r in status_rows}
    new_by_plan = {int(r["plan_days"] or 0): int(r["c"] or 0) for r in plan_rows}
    return {
        "ok": True,
        "total": int(total["c"] or 0) if total else 0,
        "status_counts": status_counts,
        "new_by_plan_days": new_by_plan,
        "server_time_ms": _now_ms(),
    }


@app.get("/console/api/available-codes")
def console_available_codes(
    status: str = "NEW",
    plan_days: int | None = None,
    keyword: str = "",
    page: int = 1,
    page_size: int = 20,
    _auth: None = Depends(_require_console_auth),
) -> dict[str, Any]:
    page_no = max(1, int(page or 1))
    size = max(1, min(100, int(page_size or 20)))
    filter_plan = None if plan_days is None else int(plan_days)
    filter_status = str(status or "NEW").strip().upper()
    if filter_status not in {"NEW", "ACTIVE", "EXPIRED", "REVOKED", "ALL"}:
        filter_status = "NEW"
    kw = str(keyword or "").strip().upper()
    now_ms = _now_ms()

    export_dir = _latest_export_dir()
    candidates = _iter_export_codes(export_dir, filter_plan)
    if kw:
        candidates = [(c, p) for (c, p) in candidates if kw in c.upper()]

    hash_list = [_hash_activation_code(_normalize_activation_code(code)) for (code, _p) in candidates]
    row_map = _db_rows_by_code_hashes(hash_list)

    available_items: list[dict[str, Any]] = []
    for code, fallback_plan in candidates:
        normalized = _normalize_activation_code(code)
        if not normalized:
            continue
        code_hash = _hash_activation_code(normalized)
        row = row_map.get(code_hash)
        if not row:
            continue
        raw_status = str(row["status"] or "UNKNOWN").upper()
        revoked = int(row["revoked"] or 0) != 0
        activated_at_ms = int(row["activated_at_ms"] or 0)
        expires_at_ms = int(row["expires_at_ms"] or 0)
        bound_device_id = str(row["bound_device_id"] or "")
        if revoked or raw_status == "REVOKED":
            view_status = "REVOKED"
        elif raw_status == "NEW":
            view_status = "NEW"
        elif expires_at_ms > 0 and expires_at_ms <= now_ms:
            view_status = "EXPIRED"
        elif raw_status == "ACTIVE":
            view_status = "ACTIVE"
        elif raw_status == "EXPIRED":
            view_status = "EXPIRED"
        else:
            view_status = raw_status

        if filter_status != "ALL" and view_status != filter_status:
            continue
        db_plan = int(row["plan_days"] or fallback_plan)
        if filter_plan is not None and db_plan != filter_plan:
            continue
        available_items.append(
            {
                "code": code,
                "plan_days": db_plan,
                "status": view_status,
                "raw_status": raw_status,
                "bound_device_id_masked": _mask_device_id(bound_device_id),
                "activated_at_ms": activated_at_ms,
                "expires_at_ms": expires_at_ms,
                "revoked": revoked,
                "created_at_ms": int(row["created_at_ms"] or 0),
            }
        )

    total = len(available_items)
    start = (page_no - 1) * size
    end = start + size
    page_items = available_items[start:end]

    return {
        "ok": True,
        "batch": export_dir.name,
        "total": total,
        "page": page_no,
        "page_size": size,
        "items": page_items,
    }


@app.post("/console/api/code")
def console_lookup_code(
    payload: LicenseConsoleLookupRequest,
    _auth: None = Depends(_require_console_auth),
) -> dict[str, Any]:
    normalized = _normalize_activation_code(payload.activation_code)
    if not normalized:
        raise HTTPException(status_code=400, detail="激活码格式无效")
    code_hash = _hash_activation_code(normalized)
    with _connect_db() as conn:
        row = conn.execute(
            """
            SELECT code_last4, plan_days, status, bound_device_id,
                   activated_at_ms, expires_at_ms, revoked, note, created_at_ms
            FROM activation_codes
            WHERE code_hash = ?
            """,
            (code_hash,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="激活码不存在")

    return {
        "ok": True,
        "code_info": {
            "code_last4": str(row["code_last4"] or ""),
            "plan_days": int(row["plan_days"] or 0),
            "status": str(row["status"] or "UNKNOWN").upper(),
            "bound_device_id_masked": _mask_device_id(str(row["bound_device_id"] or "")),
            "activated_at_ms": int(row["activated_at_ms"] or 0),
            "expires_at_ms": int(row["expires_at_ms"] or 0),
            "revoked": int(row["revoked"] or 0) != 0,
            "note": str(row["note"] or ""),
            "created_at_ms": int(row["created_at_ms"] or 0),
        },
    }


@app.post("/ocr/file", response_model=OcrResponse)
async def recognize_from_file(
    _auth: None = Depends(_require_ocr_auth),
    file: UploadFile = File(...),
) -> OcrResponse:
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
def recognize_from_base64(
    payload: Base64Request,
    _auth: None = Depends(_require_ocr_auth),
) -> OcrResponse:
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

    port = int(os.getenv("PORT", "8001"))
    reload_enabled = os.getenv("UVICORN_RELOAD", "0").strip() == "1"
    uvicorn.run("ocr_service:app", host="0.0.0.0", port=port, reload=reload_enabled)
