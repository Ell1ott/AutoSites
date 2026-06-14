"""Load on-disk inputs for an AI task: screenshot bytes, root markdown, and
optionally subpage markdown.

The crawler writes `website_crawl.pages` into `places.dynamic` (see
`jobs/crawl_sites.py`). The AI runtime reads it from the DB to map
recommended-subpage hints to their markdown files. Screenshot/HTML/markdown
files themselves still live on disk under `mapsLeadsFetcher/screenshots/`.
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

SUBPAGE_MARKDOWN_MODES = frozenset({"none", "all", "recommended"})


# ---------------------------------------------------------------------------
# File paths
# ---------------------------------------------------------------------------


def screenshot_path(place_id: str) -> Path:
    return _SCREENSHOTS / f"{place_id}.png"


def root_markdown_path(place_id: str) -> Path:
    return _SCREENSHOTS / f"{place_id}.md"


def crawl_html_on_disk(place_id: str) -> bool:
    """True when crawled HTML exists on disk (home page or subpages)."""
    return root_html_path(place_id).is_file() or any(
        _SCREENSHOTS.glob(f"{place_id}__*.html")
    )


def root_html_path(place_id: str) -> Path:
    return _SCREENSHOTS / f"{place_id}.html"


def reconstruct_website_crawl_from_disk(place_id: str) -> dict[str, Any] | None:
    """Build minimal `website_crawl` metadata from legacy on-disk crawl files.

    Leads crawled before SQLite migration often have `{place_id}.html` and
    subpage files on disk but no `places.dynamic.website_crawl` row yet.
    """
    pages: list[dict[str, Any]] = []

    home_html = root_html_path(place_id)
    if home_html.is_file():
        entry: dict[str, Any] = {
            "depth": 0,
            "html_path": f"screenshots/{place_id}.html",
        }
        home_png = screenshot_path(place_id)
        home_md = root_markdown_path(place_id)
        if home_png.is_file():
            entry["screenshot_path"] = f"screenshots/{place_id}.png"
        if home_md.is_file():
            entry["markdown_path"] = f"screenshots/{place_id}.md"
        pages.append(entry)

    for html_path in sorted(_SCREENSHOTS.glob(f"{place_id}__*.html")):
        entry = {
            "depth": 1,
            "html_path": f"screenshots/{html_path.name}",
        }
        png = html_path.with_suffix(".png")
        md = html_path.with_suffix(".md")
        if png.is_file():
            entry["screenshot_path"] = f"screenshots/{png.name}"
        if md.is_file():
            entry["markdown_path"] = f"screenshots/{md.name}"
        pages.append(entry)

    if not pages:
        return None
    return {"root": {}, "discovered_links": [], "pages": pages}


def resolve_website_crawl(wc_from_db: Any, place_id: str) -> tuple[dict[str, Any] | None, bool]:
    """Return `(website_crawl, from_disk)` using DB metadata or on-disk files."""
    if isinstance(wc_from_db, dict):
        raw_pages = wc_from_db.get("pages")
        if isinstance(raw_pages, list) and raw_pages:
            return wc_from_db, False
    recon = reconstruct_website_crawl_from_disk(place_id)
    if recon is not None:
        return recon, True
    return None, False


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

    Reads `places.dynamic.website_crawl` from the DB (written by the crawler).
    Only the recommended-subpage tasks need it.
    """
    from db.connection import session  # noqa: PLC0415 - avoid import cycle at module load

    try:
        with session(readonly=True) as c:
            row = c.execute(
                "SELECT json_extract(dynamic, '$.website_crawl') AS wc "
                "FROM places WHERE place_id = ?",
                (place_id,),
            ).fetchone()
    except Exception as exc:  # pragma: no cover - DB unavailable
        logger.warning("could not read website_crawl for %s: %s", place_id, exc)
        return []
    if not row or not row["wc"]:
        return []
    try:
        wc = json.loads(row["wc"])
    except (TypeError, ValueError):
        return []
    if not isinstance(wc, dict):
        return []
    raw = wc.get("pages")
    if not isinstance(raw, list):
        return []
    root_screenshot_rel = f"screenshots/{place_id}.png"
    root_md_rel = f"screenshots/{place_id}.md"
    out: list[dict[str, Any]] = []
    for r in raw:
        if not isinstance(r, dict):
            continue
        sp = r.get("screenshot_path")
        mp = r.get("markdown_path")
        is_home = (isinstance(sp, str) and sp.strip() == root_screenshot_rel) or (
            isinstance(mp, str) and mp.strip() == root_md_rel
        )
        if is_home:
            continue
        out.append(r)
    return out


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
