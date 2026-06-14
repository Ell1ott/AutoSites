"""Crawl place websites with Patchright and persist results to SQLite.

In-process port of `mapsLeadsFetcher/screenshot_store_websites.py`. The heavy
crawl logic still lives in that module (`_crawl_store_website` + helpers); we
import and reuse it. The difference is the sink: instead of reading/writing
`maps_businesses.json`, we read places from the DB and write `website_crawl`,
`website_screenshot_path` and `website_screenshot_error` into `places.dynamic`.

Screenshots and HTML stay on disk under `mapsLeadsFetcher/screenshots/` exactly
where `ai/place_context.py` reads them.

Public entry: `run(args, log)`. Used by `workers/handlers/crawl.py`.
"""
from __future__ import annotations

import sys
import time
from pathlib import Path
from typing import Any, Callable

from ai import place_context
from db.connection import session
from db.repos import places as places_repo

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_MLF = _REPO_ROOT / "mapsLeadsFetcher"
_SCREENSHOTS = _MLF / "screenshots"

# Defaults mirror screenshot_store_websites.py's argparse defaults.
_DEFAULTS = dict(
    timeout_ms=60_000,
    wait_until="domcontentloaded",
    ignore_https_errors=True,
    no_cookie_dismiss=False,
    cookie_rounds=4,
    cookie_click_ms=1_000,
    cookie_iframe_ms=1_000,
    cookie_settle_ms=800,
    max_subpages=50,
    max_crawl_depth=1,
    same_path_prefix=False,
    no_subpage_crawl=False,
)


def _import_crawler():
    """Import the legacy crawl helpers, adding mapsLeadsFetcher to sys.path."""
    if str(_MLF) not in sys.path:
        sys.path.insert(0, str(_MLF))
    import screenshot_store_websites as crawler  # noqa: PLC0415

    return crawler


def _load_targets(
    place_ids: list[str] | None, limit: int | None
) -> list[dict[str, Any]]:
    """Places with a website, optionally filtered to `place_ids` / capped by `limit`."""
    with session(readonly=True) as c:
        sql = "SELECT place_id, name, website FROM places WHERE website IS NOT NULL AND website != ''"
        params: list[Any] = []
        if place_ids:
            marks = ",".join("?" for _ in place_ids)
            sql += f" AND place_id IN ({marks})"
            params.extend(place_ids)
        sql += " ORDER BY name ASC"
        if limit is not None and limit > 0:
            sql += " LIMIT ?"
            params.append(int(limit))
        rows = c.execute(sql, params).fetchall()
    return [{"place_id": r["place_id"], "name": r["name"], "website": r["website"]} for r in rows]


def run(args: dict[str, Any], log) -> dict[str, Any]:  # noqa: ANN001 - JobLogger
    place_ids = args.get("place_ids")
    place_ids = [str(p) for p in place_ids] if isinstance(place_ids, list) and place_ids else None
    limit = args.get("limit")
    force = bool(args.get("force"))
    cfg = dict(_DEFAULTS)
    if args.get("max_subpages") is not None:
        cfg["max_subpages"] = int(args["max_subpages"])
    is_cancelled: Callable[[], bool] = (
        args["__cancel__"] if callable(args.get("__cancel__")) else (lambda: False)
    )

    targets = _load_targets(place_ids, int(limit) if limit is not None else None)
    log.started(total=len(targets), scope="crawl", place_ids_count=len(place_ids) if place_ids else None)

    if not targets:
        log.info("no places with a website matched; nothing to crawl")
        return {"crawled": 0, "skipped": 0, "failed": 0, "total": 0}

    crawler = _import_crawler()
    _SCREENSHOTS.mkdir(parents=True, exist_ok=True)

    crawled = skipped = failed = 0

    with crawler.sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        log.info("Chromium launched")
        try:
            context = browser.new_context(
                viewport={"width": 1280, "height": 720},
                ignore_https_errors=cfg["ignore_https_errors"],
            )
            try:
                for i, t in enumerate(targets):
                    if is_cancelled():
                        log.warn("cancellation requested; stopping crawl")
                        break
                    pid = t["place_id"]
                    name = t["name"] or pid
                    url = str(t["website"]).strip()
                    home_file = _SCREENSHOTS / f"{crawler._safe_filename_fragment(pid)}.png"

                    try:
                        home_exists = home_file.is_file() and home_file.stat().st_size > 0
                    except OSError:
                        home_exists = False
                    if home_exists and not force:
                        with session(readonly=True) as c:
                            has_crawl = c.execute(
                                "SELECT json_extract(dynamic, '$.website_crawl.pages') "
                                "FROM places WHERE place_id = ?",
                                (pid,),
                            ).fetchone()[0]
                        if not has_crawl:
                            recon = place_context.reconstruct_website_crawl_from_disk(pid)
                            if recon:
                                with session() as c:
                                    places_repo.merge_dynamic(c, pid, {"website_crawl": recon})
                        skipped += 1
                        log.info(f"{name} — skip (homepage screenshot exists)", place_id=pid)
                        log.progress(done=i + 1, total=len(targets))
                        continue

                    log.item_start(place_id=pid, name=name)
                    t_item = time.monotonic()
                    # _crawl_store_website mutates this dict in place.
                    place: dict[str, Any] = {"id": pid, "name": name, "websiteUri": url}
                    page = context.new_page()
                    try:
                        crawler._crawl_store_website(
                            page,
                            place=place,
                            start_url=url,
                            home_file_path=home_file,
                            out_dir=_SCREENSHOTS,
                            base_dir=_MLF,
                            place_id=pid,
                            wait_until=cfg["wait_until"],
                            timeout_ms=cfg["timeout_ms"],
                            no_cookie_dismiss=cfg["no_cookie_dismiss"],
                            cookie_click_ms=cfg["cookie_click_ms"],
                            cookie_iframe_ms=cfg["cookie_iframe_ms"],
                            cookie_rounds=cfg["cookie_rounds"],
                            cookie_settle_ms=cfg["cookie_settle_ms"],
                            max_subpages=cfg["max_subpages"],
                            max_crawl_depth=cfg["max_crawl_depth"],
                            same_path_prefix=cfg["same_path_prefix"],
                            no_subpage_crawl=cfg["no_subpage_crawl"],
                            log_prefix=f"[{i + 1}/{len(targets)}]",
                        )
                    finally:
                        page.close()

                    patch = {"website_crawl": place.get("website_crawl")}
                    if place.get("website_screenshot_path"):
                        patch["website_screenshot_path"] = place["website_screenshot_path"]
                    err = place.get("website_screenshot_error")
                    patch["website_screenshot_error"] = err  # None clears any prior error
                    # A lead has a URL but the site failed to load -> broken website.
                    # DNS resolution failure means the domain is gone -> no real website.
                    patch["broken_website"] = bool(err)
                    patch["no_website"] = bool(err) and "ERR_NAME_NOT_RESOLVED" in err
                    with session() as c:
                        places_repo.merge_dynamic(c, pid, patch)

                    dur = (time.monotonic() - t_item) * 1000.0
                    if err:
                        failed += 1
                        log.item_done(place_id=pid, duration_ms=dur, outputs={"error": err})
                    else:
                        crawled += 1
                        log.item_done(
                            place_id=pid,
                            duration_ms=dur,
                            outputs={"screenshot_path": place.get("website_screenshot_path")},
                        )
                    log.progress(done=i + 1, total=len(targets))
            finally:
                context.close()
        finally:
            browser.close()
            log.info("Browser closed")

    summary = {"crawled": crawled, "skipped": skipped, "failed": failed, "total": len(targets)}
    log.info("done", **summary)
    return summary
