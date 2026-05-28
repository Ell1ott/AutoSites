"""Capture and compress browser HTML when Patchright/Playwright automation fails.

On failure, handlers attach a snapshot to the exception (`browser_snapshot` attr).
`JobLogger.error()` emits a separate `browser_snapshot` event when present.

Packed format: minify-html → gzip → base64. Decode with `unpack_html()`.
"""
from __future__ import annotations

import base64
import gzip
import os
from typing import Any

try:
    import minify_html
except ImportError:  # pragma: no cover
    minify_html = None  # type: ignore[assignment]

SNAPSHOT_ATTR = "browser_snapshot"
ENCODING = "minify+gzip+base64"

MAX_RAW_HTML_BYTES = int(os.environ.get("BROWSER_SNAPSHOT_MAX_RAW_BYTES", "524288"))
MAX_PACKED_BYTES = int(os.environ.get("BROWSER_SNAPSHOT_MAX_PACKED_BYTES", "262144"))


def is_browser_automation_error(exc: BaseException) -> bool:
    """True for Patchright/Playwright API errors and locator/page timeouts."""
    mod = getattr(type(exc), "__module__", "") or ""
    if "patchright" in mod or "playwright" in mod:
        return True
    msg = str(exc)
    if type(exc).__name__ == "TimeoutError" and any(
        needle in msg for needle in ("Locator.", "Page.", "Frame.", "ElementHandle.")
    ):
        return True
    return False


def pack_html(html: str) -> dict[str, Any]:
    """Minify (when available), gzip, and base64-encode HTML for job logs."""
    text = html
    truncated = False
    raw = text.encode("utf-8")
    if len(raw) > MAX_RAW_HTML_BYTES:
        text = raw[:MAX_RAW_HTML_BYTES].decode("utf-8", errors="ignore")
        text += "\n<!-- snapshot truncated -->\n"
        truncated = True
        raw = text.encode("utf-8")

    minified = False
    if minify_html is not None:
        try:
            text = minify_html.minify(
                text,
                minify_css=True,
                minify_js=False,
                keep_closing_tags=True,
            )
            minified = True
        except Exception:  # noqa: BLE001
            pass

    payload_bytes = gzip.compress(text.encode("utf-8"), compresslevel=6)
    if len(payload_bytes) > MAX_PACKED_BYTES:
        # Shrink source and retry once (SPA HTML can minify+gzip poorly at first).
        smaller = text.encode("utf-8")[: max(32_768, MAX_RAW_HTML_BYTES // 4)].decode(
            "utf-8", errors="ignore"
        )
        smaller += "\n<!-- snapshot truncated (packed limit) -->\n"
        text = smaller
        truncated = True
        payload_bytes = gzip.compress(text.encode("utf-8"), compresslevel=9)

    if len(payload_bytes) > MAX_PACKED_BYTES:
        payload_bytes = payload_bytes[:MAX_PACKED_BYTES]
        truncated = True

    return {
        "encoding": ENCODING,
        "minified": minified,
        "truncated": truncated,
        "raw_bytes": len(raw),
        "packed_bytes": len(payload_bytes),
        "payload": base64.b64encode(payload_bytes).decode("ascii"),
    }


def unpack_html(payload: str, encoding: str = ENCODING) -> str:
    """Decode a snapshot payload back to HTML (for debugging / admin tools)."""
    if encoding != ENCODING:
        raise ValueError(f"unsupported snapshot encoding: {encoding!r}")
    data = base64.b64decode(payload.encode("ascii"))
    return gzip.decompress(data).decode("utf-8", errors="replace")


def capture_page_snapshot(page: Any) -> dict[str, Any]:
    """Read URL, title, and packed HTML from a Patchright/Playwright page."""
    url = ""
    title = ""
    html = ""
    try:
        url = page.url
    except Exception:  # noqa: BLE001
        pass
    try:
        title = page.title()
    except Exception:  # noqa: BLE001
        pass
    try:
        html = page.content()
    except Exception:  # noqa: BLE001
        html = ""

    packed = pack_html(html or "")
    return {"url": url, "title": title, **packed}


def attach_browser_snapshot(exc: BaseException, page: Any | None) -> None:
    """Best-effort: set ``exc.browser_snapshot`` when ``page`` is available."""
    if page is None or not is_browser_automation_error(exc):
        return
    if getattr(exc, SNAPSHOT_ATTR, None) is not None:
        return
    try:
        setattr(exc, SNAPSHOT_ATTR, capture_page_snapshot(page))
    except Exception:  # noqa: BLE001
        return
