#!/usr/bin/env python3
"""
Read maps_businesses.json, open each place's websiteUri with Patchright (PyPI:
`patchright`, a patched Playwright fork), save PNG(s) per store, save the page
HTML alongside each captured PNG ({same stem}.html), and write paths and crawl
metadata onto each place object in the JSON.

The homepage screenshot stays at screenshots/{placeId}.png for compatibility with
leadsOverview; HTML is screenshots/{placeId}.html. Subpages use
screenshots/{placeId}__{hash}.png and .html; paths and URLs are listed under
website_crawl.

First-time setup for browsers:

    uv run patchright install chromium

Run:

    uv run screenshot_store_websites.py [--input maps_businesses.json] [--dir screenshots]

Before each screenshot, common CMP / cookie banners are auto-dismissed (see
cookie_consent_rules.py). Use --no-cookie-dismiss to skip.

If the homepage PNG (screenshots/{placeId}.png) already exists and is non-empty,
that place is skipped entirely (no browser crawl). Use --force to crawl anyway.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import re
import sys
import time
from collections import deque
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse, urlunparse

from patchright.sync_api import FrameLocator, Page, sync_playwright

from cookie_consent_rules import COOKIE_CONSENT_RULES

logger = logging.getLogger(__name__)


def _configure_logging(*, verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
        stream=sys.stderr,
        force=True,
    )


def _safe_filename_fragment(place_id: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", place_id)
    return cleaned or "unknown_place"


def _host_match_key(hostname: str | None) -> str:
    if not hostname:
        return ""
    h = hostname.lower()
    return h[4:] if h.startswith("www.") else h


def _normalize_url(abs_url: str) -> str:
    raw = abs_url.strip()
    if not raw:
        return ""
    p = urlparse(raw)
    if p.scheme not in ("http", "https") or not p.hostname:
        return ""
    scheme = p.scheme.lower()
    host = p.hostname.lower()
    netloc = host
    if p.port and not (
        (scheme == "http" and p.port == 80) or (scheme == "https" and p.port == 443)
    ):
        netloc = f"{host}:{p.port}"
    path = p.path if p.path else "/"
    return urlunparse((scheme, netloc, path, p.params, p.query, ""))


def _is_navigable_http(url_norm: str) -> bool:
    if not url_norm:
        return False
    return urlparse(url_norm).scheme in ("http", "https")


def _origin_compatible(a: str, b: str) -> bool:
    pa, pb = urlparse(a), urlparse(b)
    if pa.scheme not in ("http", "https") or pb.scheme not in ("http", "https"):
        return False
    return _host_match_key(pa.hostname) == _host_match_key(pb.hostname)


def _path_prefix_allowed(page_url: str, root_prefix_path: str) -> bool:
    if not root_prefix_path or root_prefix_path == "/":
        return True
    path = urlparse(page_url).path or "/"
    pref = root_prefix_path.rstrip("/")
    u = path.rstrip("/") or "/"
    return u == pref or u.startswith(pref + "/")


def _subpage_file_stem(place_id: str, url_norm: str) -> str:
    h = hashlib.sha256(url_norm.encode("utf-8")).hexdigest()[:12]
    return f"{_safe_filename_fragment(place_id)}__{h}"


def _extract_dom_link_rows(page: Page) -> list[dict[str, Any]]:
    raw = page.evaluate(
        """() => {
          const sel = [
            'a[href]',
            'area[href]',
            '[role="link"][href]',
            'button[formaction]',
            'input[type="submit"][formaction]',
            'input[type="image"][formaction]',
          ].join(', ');
          const items = [];
          for (const el of document.querySelectorAll(sel)) {
            const tag = el.tagName.toLowerCase();
            let rawHref = null;
            if (tag === 'a' || tag === 'area') rawHref = el.getAttribute('href');
            else rawHref = el.getAttribute('formaction');
            if (rawHref == null || rawHref === '') continue;
            items.push({
              raw_href: rawHref,
              tag,
              text: (el.textContent || '').trim().slice(0, 500),
              aria_label: el.getAttribute('aria-label'),
              rel: el.getAttribute('rel'),
            });
          }
          return items;
        }"""
    )
    if not isinstance(raw, list):
        return []
    return [r for r in raw if isinstance(r, dict)]


def _append_discovered_for_page(
    *,
    page: Page,
    source_final_url: str,
    origin_final_url: str,
    path_prefix_root: str | None,
    discovered_links: list[dict[str, Any]],
) -> tuple[int, list[str]]:
    rows = _extract_dom_link_rows(page)
    base = source_final_url
    count = 0
    internal_seen: set[str] = set()
    internal_urls: list[str] = []
    for row in rows:
        raw = row.get("raw_href")
        if not isinstance(raw, str) or not raw.strip():
            continue
        raw_s = raw.strip()
        low = raw_s.lower()
        if low.startswith(("mailto:", "tel:", "javascript:", "data:")):
            continue
        if raw_s.startswith("#"):
            continue
        resolved = _normalize_url(urljoin(base, raw_s))
        if not resolved or not _is_navigable_http(resolved):
            continue
        internal = _origin_compatible(resolved, origin_final_url)
        if internal and path_prefix_root is not None:
            internal = internal and _path_prefix_allowed(resolved, path_prefix_root)
        tag = row.get("tag")
        discovered_links.append(
            {
                "resolved_url": resolved,
                "raw_href": raw_s,
                "tag": tag if isinstance(tag, str) else None,
                "text": row.get("text") if isinstance(row.get("text"), str) else None,
                "aria_label": row.get("aria_label")
                if isinstance(row.get("aria_label"), str)
                else None,
                "rel": row.get("rel") if isinstance(row.get("rel"), str) else None,
                "source_page_url": source_final_url,
                "is_internal": internal,
            }
        )
        count += 1
        if internal and resolved not in internal_seen:
            internal_seen.add(resolved)
            internal_urls.append(resolved)
    return count, internal_urls


def _crawl_store_website(
    page: Page,
    *,
    place: dict[str, Any],
    start_url: str,
    home_file_path: Path,
    out_dir: Path,
    base_dir: Path,
    place_id: str,
    wait_until: str,
    timeout_ms: int,
    no_cookie_dismiss: bool,
    cookie_click_ms: int,
    cookie_iframe_ms: int,
    cookie_rounds: int,
    cookie_settle_ms: int,
    max_subpages: int,
    max_crawl_depth: int,
    same_path_prefix: bool,
    no_subpage_crawl: bool,
    log_prefix: str,
) -> None:
    place.pop("website_screenshot_error", None)
    place.pop("website_screenshot_path", None)

    effective_depth_cap = 0 if no_subpage_crawl else max_crawl_depth

    crawl: dict[str, Any] = {
        "root": {"url_requested": start_url, "url_final": None, "nav_seconds": None},
        "discovered_links": [],
        "pages": [],
    }
    place["website_crawl"] = crawl

    discovered_links: list[dict[str, Any]] = crawl["discovered_links"]
    pages_out: list[dict[str, Any]] = crawl["pages"]

    processed_final: set[str] = set()
    queued: set[str] = set()
    queue: deque[tuple[str, int]] = deque()
    qkey = _normalize_url(start_url)
    if qkey:
        queue.append((qkey, 0))
        queued.add(qkey)
    else:
        place["website_screenshot_error"] = (
            "invalid_website_uri: could not normalize to http(s) URL "
            f"(raw={start_url!r})"
        )
        return

    origin_final: str | None = None
    path_prefix_root: str | None = None
    home_captured = False

    while queue and len(pages_out) < max_subpages:
        req_norm, depth = queue.popleft()
        queued.discard(req_norm)
        if not req_norm:
            continue
        page_entry: dict[str, Any] = {
            "url_requested": req_norm,
            "url_final": None,
            "depth": depth,
            "screenshot_path": None,
            "html_path": None,
            "screenshot_error": None,
            "link_count_seen_on_page": None,
        }
        try:
            t_nav = time.perf_counter()
            page.goto(req_norm, wait_until=wait_until, timeout=timeout_ms)
            nav_s = time.perf_counter() - t_nav
            final_norm = _normalize_url(page.url)
            if not final_norm:
                raise ValueError(f"Unsupported or empty final URL after navigation: {page.url!r}")
            page_entry["url_final"] = final_norm
            if origin_final is None:
                crawl["root"]["url_final"] = final_norm
                crawl["root"]["nav_seconds"] = round(nav_s, 3)
                origin_final = final_norm
                path_prefix_root = (urlparse(final_norm).path or "/") if same_path_prefix else None

            if final_norm in processed_final:
                page_entry["screenshot_error"] = "skipped_duplicate_final_url"
                pages_out.append(page_entry)
                continue
            processed_final.add(final_norm)

            is_home = depth == 0 and not home_captured
            shot_path = home_file_path if is_home else out_dir / f"{_subpage_file_stem(place_id, final_norm)}.png"
            sub_prefix = f"{log_prefix} depth={depth}"
            logger.info(
                "%s navigated in %.2fs — final URL %s",
                sub_prefix,
                nav_s,
                page.url,
            )
            t_cookie = time.perf_counter()
            if not no_cookie_dismiss:
                dismissed = _dismiss_cookie_banners(
                    page,
                    click_timeout_ms=cookie_click_ms,
                    iframe_probe_ms=cookie_iframe_ms,
                    rounds=cookie_rounds,
                    log_prefix=sub_prefix,
                )
                logger.info(
                    "%s cookie banner pass finished in %.2fs",
                    sub_prefix,
                    time.perf_counter() - t_cookie,
                )
                if dismissed and cookie_settle_ms > 0:
                    page.wait_for_timeout(cookie_settle_ms)
            else:
                logger.info("%s cookie dismiss skipped (--no-cookie-dismiss)", sub_prefix)
            t_shot = time.perf_counter()
            page.screenshot(path=str(shot_path), full_page=True)
            logger.debug("%s screenshot %.2fs", sub_prefix, time.perf_counter() - t_shot)
            html_path = shot_path.with_suffix(".html")
            t_html = time.perf_counter()
            html_path.write_text(page.content(), encoding="utf-8")
            logger.debug("%s html %.2fs", sub_prefix, time.perf_counter() - t_html)
            rel = shot_path.relative_to(base_dir)
            page_entry["screenshot_path"] = rel.as_posix()
            page_entry["html_path"] = html_path.relative_to(base_dir).as_posix()
            if is_home:
                place["website_screenshot_path"] = rel.as_posix()
                home_captured = True
            try:
                nbytes = shot_path.stat().st_size
            except OSError:
                nbytes = -1
            logger.info(
                "%s saved %s (%d bytes)",
                sub_prefix,
                shot_path,
                nbytes,
            )

            assert origin_final is not None
            nlinks, internal_urls = _append_discovered_for_page(
                page=page,
                source_final_url=final_norm,
                origin_final_url=origin_final,
                path_prefix_root=path_prefix_root,
                discovered_links=discovered_links,
            )
            page_entry["link_count_seen_on_page"] = nlinks
            pages_out.append(page_entry)

            if depth >= effective_depth_cap:
                continue
            if len(pages_out) >= max_subpages:
                continue
            for nxt in internal_urls:
                if nxt in processed_final or nxt in queued:
                    continue
                if len(pages_out) + len(queue) >= max_subpages:
                    break
                queue.append((nxt, depth + 1))
                queued.add(nxt)
        except Exception as exc:
            page_entry["screenshot_error"] = f"{type(exc).__name__}: {exc}"
            pages_out.append(page_entry)
            if depth == 0:
                place.pop("website_screenshot_path", None)
                place["website_screenshot_error"] = page_entry["screenshot_error"]
            logger.error("%s failed %s: %s", log_prefix, req_norm, page_entry["screenshot_error"])
            if depth == 0:
                break


def _load_record(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError(f"Expected JSON object at top level, got {type(data).__name__}")
    return data


def _places_list(record: dict[str, Any]) -> list[dict[str, Any]]:
    api = record.get("api_response")
    if not isinstance(api, dict):
        return []
    raw = api.get("places")
    if not isinstance(raw, list):
        return []
    return [p for p in raw if isinstance(p, dict)]


def _split_iframe_selectors(iframe_value: str) -> list[str]:
    return [p.strip() for p in iframe_value.split(",") if p.strip()]


def _probe_frame(
    root: Page | FrameLocator,
    iframe_sel: str,
    probe_ms: int,
) -> FrameLocator | None:
    try:
        if root.locator(iframe_sel).count() == 0:
            return None
        fl = root.frame_locator(iframe_sel)
        fl.locator("html").first.wait_for(state="attached", timeout=probe_ms)
        return fl
    except Exception:
        return None


def _try_click(root: Page | FrameLocator, selector: str, timeout_ms: int) -> bool:
    try:
        loc = root.locator(selector).first
        if loc.count() == 0:
            return False
        loc.click(timeout=timeout_ms, force=True)
        return True
    except Exception:
        return False


def _apply_consent_rule(
    page: Page,
    actions: list[tuple[str, str | list[str]]],
    *,
    click_timeout_ms: int,
    iframe_probe_ms: int,
) -> bool:
    root: Page | FrameLocator = page
    for kind, value in actions:
        if kind == "iframe":
            if not isinstance(value, str):
                return False
            found: FrameLocator | None = None
            for ifs in _split_iframe_selectors(value):
                found = _probe_frame(root, ifs, iframe_probe_ms)
                if found is not None:
                    break
            if found is None:
                return False
            root = found
        elif kind == "css":
            if not isinstance(value, str):
                return False
            if not _try_click(root, value, click_timeout_ms):
                return False
        elif kind == "css_list":
            if not isinstance(value, list):
                return False
            ok = False
            for sel in value:
                if not isinstance(sel, str):
                    continue
                if _try_click(root, sel, click_timeout_ms):
                    ok = True
                    break
            if not ok:
                return False
        else:
            return False
    return True


def _dismiss_cookie_banners(
    page: Page,
    *,
    click_timeout_ms: int,
    iframe_probe_ms: int,
    rounds: int,
    log_prefix: str,
) -> bool:
    """Try CMP/cookie rules. Returns True if at least one accept click succeeded.

    Polls up to 1s total for a banner to appear; each rule pass is fast because
    _try_click bails on non-matching selectors via count().
    """
    deadline = time.monotonic() + 1.0
    any_dismissed = False
    max_rounds = max(1, rounds)
    for round_idx in range(max_rounds):
        progressed = False
        while time.monotonic() < deadline:
            for rule_idx, rule in enumerate(COOKIE_CONSENT_RULES):
                if _apply_consent_rule(
                    page,
                    rule,
                    click_timeout_ms=click_timeout_ms,
                    iframe_probe_ms=iframe_probe_ms,
                ):
                    logger.debug("%s cookie rule matched (index %d)", log_prefix, rule_idx)
                    any_dismissed = True
                    progressed = True
                    break
            if progressed:
                break
            page.wait_for_timeout(50)
        if not progressed:
            break
        page.wait_for_timeout(400)
    return any_dismissed


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Screenshot each store website from maps_businesses.json via Patchright."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("maps_businesses.json"),
        help="Path to maps_businesses.json",
    )
    parser.add_argument(
        "--dir",
        dest="screenshot_dir",
        type=Path,
        default=Path("screenshots"),
        help="Directory for PNG files (created under the JSON file's parent)",
    )
    parser.add_argument(
        "--timeout-ms",
        type=int,
        default=60_000,
        help="Navigation timeout in milliseconds",
    )
    parser.add_argument(
        "--wait-until",
        choices=("commit", "domcontentloaded", "load", "networkidle"),
        default="domcontentloaded",
        help=(
            "page.goto wait_until; default domcontentloaded avoids long hangs when third-party "
            "assets never finish (use load or networkidle if you need a more settled page)"
        ),
    )
    parser.add_argument(
        "--ignore-https-errors",
        action="store_true",
        help="Pass bad/self-signed TLS (sets browser context ignore_https_errors)",
    )
    parser.add_argument(
        "--no-cookie-dismiss",
        action="store_true",
        help="Skip automatic cookie / CMP banner dismissal before screenshots",
    )
    parser.add_argument(
        "--cookie-rounds",
        type=int,
        default=4,
        help="Max passes over CMP rules (stops when no banner matched)",
    )
    parser.add_argument(
        "--cookie-click-ms",
        type=int,
        default=1_000,
        help="Max wait per accept-button click / element to appear (ms)",
    )
    parser.add_argument(
        "--cookie-iframe-ms",
        type=int,
        default=1_000,
        help="Max wait for consent iframe to attach (ms)",
    )
    parser.add_argument(
        "--cookie-settle-ms",
        type=int,
        default=800,
        help=(
            "After a cookie accept click succeeds, wait this long before screenshot "
            "(banner close / layout settle); 0 disables"
        ),
    )
    parser.add_argument(
        "--max-subpages",
        type=int,
        default=50,
        help="Max total pages to load per store (including the homepage); default 50",
    )
    parser.add_argument(
        "--max-crawl-depth",
        type=int,
        default=2,
        help=(
            "Maximum BFS depth from the homepage for internal links (0 = homepage only); "
            "default 2"
        ),
    )
    parser.add_argument(
        "--same-path-prefix",
        action="store_true",
        help=(
            "Only treat URLs as internal for crawling if their path is under the homepage "
            "final path (same host still required)"
        ),
    )
    parser.add_argument(
        "--no-subpage-crawl",
        action="store_true",
        help="Do not follow internal links; still records discovered_links from the homepage",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Crawl even when the homepage PNG already exists on disk",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Log debug detail (per-rule cookie dismissal, etc.)",
    )
    args = parser.parse_args()

    _configure_logging(verbose=args.verbose)

    if args.max_subpages < 1:
        logger.error("--max-subpages must be at least 1")
        sys.exit(2)
    if args.max_crawl_depth < 0:
        logger.error("--max-crawl-depth must be >= 0")
        sys.exit(2)
    logger.info(
        "Starting screenshot run (input=%s, screenshot_dir=%s, wait_until=%s, timeout_ms=%s, "
        "ignore_https_errors=%s, cookie_dismiss=%s, max_subpages=%s, max_crawl_depth=%s, "
        "same_path_prefix=%s, no_subpage_crawl=%s, force=%s)",
        args.input,
        args.screenshot_dir,
        args.wait_until,
        args.timeout_ms,
        args.ignore_https_errors,
        not args.no_cookie_dismiss,
        args.max_subpages,
        args.max_crawl_depth,
        args.same_path_prefix,
        args.no_subpage_crawl,
        args.force,
    )

    json_path = args.input.resolve()
    if not json_path.is_file():
        logger.error("Input JSON not found: %s", json_path)
        sys.exit(1)

    logger.info("Loading %s", json_path)
    record = _load_record(json_path)
    places = _places_list(record)
    logger.info("Found %d place(s) in JSON", len(places))
    base_dir = json_path.parent
    out_dir = (base_dir / args.screenshot_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    logger.info("Screenshot output directory: %s", out_dir)

    urls: list[tuple[dict[str, Any], str, Path]] = []
    for place in places:
        uri = place.get("websiteUri")
        if not uri or not str(uri).strip():
            place.pop("website_screenshot_path", None)
            place.pop("website_screenshot_error", None)
            place.pop("website_crawl", None)
            continue
        pid = str(place.get("id") or place.get("name") or "place")
        file_path = out_dir / f"{_safe_filename_fragment(pid)}.png"
        urls.append((place, str(uri).strip(), file_path))

    if not urls:
        with json_path.open("w", encoding="utf-8") as f:
            json.dump(record, f, indent=2, ensure_ascii=False)
            f.write("\n")
        logger.warning("No websiteUri values found; JSON updated for cleanup only.")
        return

    skipped_no_uri = len(places) - len(urls)
    try:
        skipped_home = sum(
            1
            for _, _, fp in urls
            if fp.is_file() and fp.stat().st_size > 0 and not args.force
        )
    except OSError:
        skipped_home = 0
    to_crawl = len(urls) - skipped_home
    logger.info(
        "%d place(s) with websiteUri (%d without URI skipped); %d to crawl, "
        "%d skipped — homepage PNG already on disk%s",
        len(urls),
        skipped_no_uri,
        to_crawl,
        skipped_home,
        " (--force set)" if args.force else "",
    )
    if to_crawl == 0:
        logger.info("Nothing to crawl; skipping browser launch.")
    else:
        logger.info(
            "Opening Patchright / Chromium (headless) — first navigation may take a while",
        )
        with sync_playwright() as p:
            logger.debug("sync_playwright() context entered")
            browser = p.chromium.launch(headless=True)
            logger.info("Chromium launched")
            try:
                context = browser.new_context(
                    viewport={"width": 1280, "height": 720},
                    ignore_https_errors=args.ignore_https_errors,
                )
                logger.info("Browser context ready (viewport 1280x720)")
                try:
                    for i, (place, url, file_path) in enumerate(urls, start=1):
                        label = place.get("name") or place.get("id") or url
                        prefix = f"[{i}/{len(urls)}]"
                        pid = str(place.get("id") or place.get("name") or "place")
                        try:
                            home_exists = file_path.is_file() and file_path.stat().st_size > 0
                        except OSError:
                            home_exists = False
                        if home_exists and not args.force:
                            logger.info(
                                "%s %s — skip (homepage screenshot exists: %s)",
                                prefix,
                                label,
                                file_path,
                            )
                            continue
                        logger.info(
                            "%s %s — crawl start %s (wait_until=%s, timeout_ms=%s)",
                            prefix,
                            label,
                            url,
                            args.wait_until,
                            args.timeout_ms,
                        )
                        page = context.new_page()
                        try:
                            _crawl_store_website(
                                page,
                                place=place,
                                start_url=url,
                                home_file_path=file_path,
                                out_dir=out_dir,
                                base_dir=base_dir,
                                place_id=pid,
                                wait_until=args.wait_until,
                                timeout_ms=args.timeout_ms,
                                no_cookie_dismiss=args.no_cookie_dismiss,
                                cookie_click_ms=args.cookie_click_ms,
                                cookie_iframe_ms=args.cookie_iframe_ms,
                                cookie_rounds=args.cookie_rounds,
                                cookie_settle_ms=args.cookie_settle_ms,
                                max_subpages=args.max_subpages,
                                max_crawl_depth=args.max_crawl_depth,
                                same_path_prefix=args.same_path_prefix,
                                no_subpage_crawl=args.no_subpage_crawl,
                                log_prefix=prefix,
                            )
                        finally:
                            page.close()
                finally:
                    context.close()
                    logger.debug("browser context closed")
            finally:
                browser.close()
                logger.info("Browser closed")

    logger.info("Writing updated JSON to %s", json_path)
    with json_path.open("w", encoding="utf-8") as f:
        json.dump(record, f, indent=2, ensure_ascii=False)
        f.write("\n")

    ok = sum(1 for p in places if p.get("website_screenshot_path"))
    logger.info(
        "Done: %d/%d place(s) with websiteUri have screenshot path in JSON (%d skipped — existing homepage PNG)",
        ok,
        len(urls),
        skipped_home,
    )


if __name__ == "__main__":
    main()
