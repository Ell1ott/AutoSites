"""Load on-disk inputs for an AI task: screenshot bytes, root markdown, and
optionally subpage markdown.

The crawler still writes `website_crawl.pages` into
`mapsLeadsFetcher/maps_businesses.json`. The AI runtime reads that JSON to map
recommended-subpage hints to their markdown files. When the crawler is later
ported to write straight into the DB, the only thing that needs to change here
is `_crawl_pages_for_place`.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_MLF = _REPO_ROOT / "mapsLeadsFetcher"
_SCREENSHOTS = _MLF / "screenshots"
_MAPS_JSON = _MLF / "maps_businesses.json"

SUBPAGE_MARKDOWN_MODES = frozenset({"none", "all", "recommended"})


# ---------------------------------------------------------------------------
# File paths
# ---------------------------------------------------------------------------


def screenshot_path(place_id: str) -> Path:
    return _SCREENSHOTS / f"{place_id}.png"


def root_markdown_path(place_id: str) -> Path:
    return _SCREENSHOTS / f"{place_id}.md"


def load_screenshot(place_id: str) -> bytes | None:
    p = screenshot_path(place_id)
    if not p.is_file():
        return None
    return p.read_bytes()


def load_root_markdown(place_id: str) -> str | None:
    p = root_markdown_path(place_id)
    if not p.is_file():
        return None
    return p.read_text(encoding="utf-8")


# ---------------------------------------------------------------------------
# Subpage markdown
# ---------------------------------------------------------------------------


def assemble_markdown_blob(
    *,
    place_id: str,
    root_markdown: str,
    subpage_mode: str,
    recommended_hints: Any,
) -> str:
    """Compose root markdown plus optional subpages per the task config.

    `subpage_mode`: "none" | "all" | "recommended"
    `recommended_hints`: value of the place's recommended-subpages field
        (typically `place.dynamic.ai_subpages` — a dict with a `subpages` list
        of `{path_or_hint, name, summary}` entries).
    """
    if subpage_mode == "none":
        return root_markdown
    pages = _crawl_pages_for_place(place_id)
    if not pages:
        return root_markdown

    selected: list[dict[str, Any]]
    if subpage_mode == "recommended":
        hints = _normalize_hints(recommended_hints)
        if not hints:
            return root_markdown
        selected = _match_hints(hints, pages)
    elif subpage_mode == "all":
        selected = pages
    else:
        logger.warning("unknown subpage_markdown_mode %r — using root only", subpage_mode)
        return root_markdown

    chunks: list[tuple[str, str]] = []
    for page in selected:
        mrel = page.get("markdown_path")
        if not isinstance(mrel, str) or not mrel.strip():
            continue
        mpath = (_MLF / mrel.strip()).resolve()
        if not mpath.is_file():
            logger.warning("subpage markdown missing: %s", mpath)
            continue
        title = (
            page.get("url_final")
            or page.get("url_requested")
            or mrel.strip()
        )
        try:
            chunks.append((str(title), mpath.read_text(encoding="utf-8").strip()))
        except OSError as exc:
            logger.warning("could not read subpage markdown %s: %s", mpath, exc)

    if not chunks:
        return root_markdown

    parts = [root_markdown.rstrip(), "", "---", "", "Additional subpage markdown:", ""]
    for title, body in chunks:
        parts.append(f"### {title}")
        parts.append("")
        parts.append(body)
        parts.append("")
    return "\n".join(parts).rstrip()


# ---------------------------------------------------------------------------
# Internals — port of the legacy crawl-page helpers
# ---------------------------------------------------------------------------


def _crawl_pages_for_place(place_id: str) -> list[dict[str, Any]]:
    """Look up `website_crawl.pages` for a place, excluding the home page row.

    Reads `maps_businesses.json` (the crawler's source of truth) every call —
    the file is small and only the recommended-subpage tasks need it.
    """
    if not _MAPS_JSON.is_file():
        return []
    try:
        with _MAPS_JSON.open(encoding="utf-8") as f:
            doc = json.load(f)
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("could not read maps_businesses.json: %s", exc)
        return []
    api = doc.get("api_response") or {}
    places = api.get("places")
    if not isinstance(places, list):
        return []
    root_screenshot_rel = f"screenshots/{place_id}.png"
    root_md_rel = f"screenshots/{place_id}.md"
    for p in places:
        if not isinstance(p, dict) or p.get("id") != place_id:
            continue
        wc = p.get("website_crawl")
        if not isinstance(wc, dict):
            return []
        raw = wc.get("pages")
        if not isinstance(raw, list):
            return []
        out: list[dict[str, Any]] = []
        for row in raw:
            if not isinstance(row, dict):
                continue
            sp = row.get("screenshot_path")
            mp = row.get("markdown_path")
            is_home = (isinstance(sp, str) and sp.strip() == root_screenshot_rel) or (
                isinstance(mp, str) and mp.strip() == root_md_rel
            )
            if is_home:
                continue
            out.append(row)
        return out
    return []


def _normalize_hints(raw: Any) -> list[dict[str, Any]]:
    if not isinstance(raw, dict):
        return []
    subs = raw.get("subpages")
    if not isinstance(subs, list):
        return []
    return [x for x in subs if isinstance(x, dict)]


def _match_hints(hints: list[dict[str, Any]], pages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    used: set[int] = set()
    selected: list[dict[str, Any]] = []
    for h in hints:
        poh = h.get("path_or_hint")
        if not isinstance(poh, str) or not poh.strip():
            continue
        for idx, page in enumerate(pages):
            if idx in used:
                continue
            if _hint_matches_page(poh, page):
                selected.append(page)
                used.add(idx)
                break
    return selected


def _host_key(hostname: str | None) -> str:
    if not hostname:
        return ""
    h = hostname.lower()
    return h[4:] if h.startswith("www.") else h


def _norm_url_path(path: str) -> str:
    p = (path or "/").strip() or "/"
    if not p.startswith("/"):
        p = "/" + p
    s = p.rstrip("/")
    return s if s else "/"


def _hint_matches_page(hint_raw: str, page: dict[str, Any]) -> bool:
    hint = hint_raw.strip()
    if not hint:
        return False
    urls: list[str] = []
    for key in ("url_final", "url_requested"):
        u = page.get(key)
        if isinstance(u, str) and u.strip():
            urls.append(u.strip())
    if not urls:
        return False
    if hint.lower().startswith(("http://", "https://")):
        ph = urlparse(hint)
        hint_host: str | None = _host_key(ph.hostname)
        hint_path = _norm_url_path(ph.path or "/")
    else:
        hint_host = None
        hint_path = _norm_url_path(hint if hint.startswith("/") else "/" + hint)
    for u in urls:
        pu = urlparse(u)
        page_host = _host_key(pu.hostname)
        page_path = _norm_url_path(pu.path or "/")
        if hint_host is not None and page_host != hint_host:
            continue
        if page_path == hint_path or (
            hint_path != "/" and page_path.startswith(hint_path + "/")
        ):
            return True
    return False
