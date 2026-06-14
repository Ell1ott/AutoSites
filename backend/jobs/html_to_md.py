"""Convert crawled HTML to Markdown and persist paths to SQLite.

In-process port of `mapsLeadsFetcher/html_to_markdown.py`. Reads each place's
`website_crawl.pages` from `places.dynamic` (written by `jobs/crawl_sites.py`),
converts every referenced `html_path` to Markdown via markitdown, writes the
`.md` next to its `.html` on disk, records `markdown_path` back onto the page
entry, and writes the updated `website_crawl` back into `places.dynamic`.

The home page's markdown lands at `screenshots/{place_id}.md`, where
`ai/place_context.load_root_markdown` reads it.

Public entry: `run(args, log)`. Used by `workers/handlers/html_to_md.py`.
"""
from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any, Callable

from ai import place_context
from db.connection import session
from db.repos import places as places_repo

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_MLF = _REPO_ROOT / "mapsLeadsFetcher"


def _load_targets(place_ids: list[str] | None, limit: int | None) -> list[dict[str, Any]]:
    """Places that have a crawl with pages, optionally filtered/capped."""
    with session(readonly=True) as c:
        if place_ids:
            marks = ",".join("?" for _ in place_ids)
            sql = (
                "SELECT place_id, name, json_extract(dynamic, '$.website_crawl') AS wc "
                f"FROM places WHERE place_id IN ({marks})"
            )
            params: list[Any] = list(place_ids)
        else:
            sql = (
                "SELECT place_id, name, json_extract(dynamic, '$.website_crawl') AS wc "
                "FROM places WHERE json_extract(dynamic, '$.website_crawl.pages') IS NOT NULL"
            )
            params = []
        sql += " ORDER BY name ASC"
        if limit is not None and limit > 0:
            sql += " LIMIT ?"
            params.append(int(limit))
        rows = c.execute(sql, params).fetchall()

    out: list[dict[str, Any]] = []
    for r in rows:
        try:
            wc_raw = json.loads(r["wc"]) if r["wc"] else None
        except (TypeError, ValueError):
            wc_raw = None
        wc, crawl_from_disk = place_context.resolve_website_crawl(wc_raw, r["place_id"])
        if isinstance(wc, dict):
            out.append(
                {
                    "place_id": r["place_id"],
                    "name": r["name"],
                    "website_crawl": wc,
                    "crawl_from_disk": crawl_from_disk,
                }
            )
    return out


def run(args: dict[str, Any], log) -> dict[str, Any]:  # noqa: ANN001 - JobLogger
    place_ids = args.get("place_ids")
    place_ids = [str(p) for p in place_ids] if isinstance(place_ids, list) and place_ids else None
    limit = args.get("limit")
    force = bool(args.get("force"))
    is_cancelled: Callable[[], bool] = (
        args["__cancel__"] if callable(args.get("__cancel__")) else (lambda: False)
    )

    from markitdown import MarkItDown  # noqa: PLC0415 - heavy import, keep lazy

    targets = _load_targets(place_ids, int(limit) if limit is not None else None)
    log.started(total=len(targets), scope="html_to_md", place_ids_count=len(place_ids) if place_ids else None)

    if not targets:
        log.info("no crawled places matched; nothing to convert")
        return {"converted": 0, "skipped": 0, "missing": 0, "failed": 0, "places": 0}

    md = MarkItDown()
    converted = skipped = missing = failed = 0

    for i, t in enumerate(targets):
        if is_cancelled():
            log.warn("cancellation requested; stopping conversion")
            break
        pid = t["place_id"]
        wc = t["website_crawl"]
        if t.get("crawl_from_disk"):
            with session() as c:
                places_repo.merge_dynamic(c, pid, {"website_crawl": wc})
        pages = [p for p in (wc.get("pages") or []) if isinstance(p, dict)]
        log.item_start(place_id=pid, name=t["name"])
        t_item = time.monotonic()
        changed = False

        for page in pages:
            html_rel = page.get("html_path")
            if not isinstance(html_rel, str) or not html_rel.strip():
                continue
            html_path = (_MLF / html_rel.strip()).resolve()
            if not html_path.is_file():
                page["markdown_error"] = "html_missing"
                page.pop("markdown_path", None)
                missing += 1
                changed = True
                continue
            md_path = html_path.with_suffix(".md")
            md_rel = md_path.relative_to(_MLF).as_posix()
            if md_path.is_file() and md_path.stat().st_size > 0 and not force:
                if page.get("markdown_path") != md_rel:
                    page["markdown_path"] = md_rel
                    changed = True
                page.pop("markdown_error", None)
                skipped += 1
                continue
            try:
                result = md.convert(str(html_path))
                md_path.write_text(result.text_content or "", encoding="utf-8")
                page["markdown_path"] = md_rel
                page.pop("markdown_error", None)
                converted += 1
                changed = True
            except Exception as exc:
                page["markdown_error"] = f"{type(exc).__name__}: {exc}"
                page.pop("markdown_path", None)
                failed += 1
                changed = True
                log.warn(f"failed converting {html_rel}: {exc}", place_id=pid)

        if changed:
            with session() as c:
                places_repo.merge_dynamic(c, pid, {"website_crawl": wc})

        dur = (time.monotonic() - t_item) * 1000.0
        log.item_done(place_id=pid, duration_ms=dur, outputs={"pages": len(pages)})
        log.progress(done=i + 1, total=len(targets))

    summary = {
        "converted": converted,
        "skipped": skipped,
        "missing": missing,
        "failed": failed,
        "places": len(targets),
    }
    log.info("done", **summary)
    return summary
