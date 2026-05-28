"""Static-file serving for crawl artifacts under `mapsLeadsFetcher/screenshots/`.

admin-next reads these via `<img src=...>` (and links for debug HTML/MD), so no
Auth dep — the place_id-prefixed filenames are unguessable enough in practice.
Path traversal is rejected at resolve-time.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from api.routes.leads import SCREENSHOTS_DIR

router = APIRouter(prefix="/screenshots", tags=["screenshots"])

_MEDIA_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".html": "text/html",
    ".md": "text/markdown",
}


@router.get("/{path:path}")
def get_screenshot(path: str):
    candidate = (SCREENSHOTS_DIR / path).resolve()
    if not candidate.is_relative_to(SCREENSHOTS_DIR) or not candidate.is_file():
        raise HTTPException(status_code=404, detail="screenshot not found")
    media_type = _MEDIA_TYPES.get(candidate.suffix.lower(), "application/octet-stream")
    return FileResponse(candidate, media_type=media_type)
