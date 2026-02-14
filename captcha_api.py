from __future__ import annotations

import base64
import math
from collections import defaultdict
from typing import Any

import ddddocr
from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel

app = FastAPI(title="Captcha OCR API", version="1.0.0")
ocr = ddddocr.DdddOcr()


class Base64Request(BaseModel):
    image_base64: str


class OcrResponse(BaseModel):
    code: str
    candidates: list[str] = []


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
    primary = ocr.classification(image_bytes).strip()
    try:
        prob_result: dict[str, Any] = ocr.classification(image_bytes, probability=True)
        candidates = _ctc_beam_candidates(
            probability=prob_result.get("probability", []),
            charsets=prob_result.get("charsets", []),
            max_candidates=8,
        )
    except Exception:
        candidates = []

    merged = []
    seen = set()
    for item in [primary, *candidates]:
        if not item:
            continue
        k = item.lower()
        if k in seen:
            continue
        seen.add(k)
        merged.append(item)
    return OcrResponse(code=primary, candidates=merged)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


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
