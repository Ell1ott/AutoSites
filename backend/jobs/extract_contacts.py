"""Extract emails, phones, and social links from crawled HTML.

Reads each place's `website_crawl.pages[].html_path` from `places.dynamic`,
scans the on-disk HTML with regex/heuristics (no AI), and stores aggregated
contact data in `places.dynamic.website_contacts`.

Public entry: `run(args, log)`. Used by `workers/handlers/extract_contacts.py`.
"""
from __future__ import annotations

import html as html_lib
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from ai import place_context
from db.connection import session
from db.repos import places as places_repo

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_MLF = _REPO_ROOT / "mapsLeadsFetcher"

_EMAIL_RE = re.compile(
    r"(?i)(?:mailto:)?([a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,})",
)
_OBF_EMAIL_RE = re.compile(
    r"(?i)\b([a-z0-9._%+\-]+)\s*(?:\(at\)|\[at\]|@)\s*([a-z0-9.\-]+)\s*(?:\(dot\)|\[dot\]|\.)\s*([a-z]{2,})\b",
)
# Human-formatted phone patterns only — avoid JS ids, SVG coords, IPs, dates.
_PHONE_TEXT_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\+[\d][\d\s().\-]{7,18}"),
    re.compile(r"(?<!\d)\+45\s?(?:\d{2}[\s.\-]){3}\d{2}(?!\d)"),
    # Danish 8-digit local format; first digit 2-9 avoids SVG coordinate runs.
    re.compile(r"(?<!\d)[2-9]\d[\s.\-]\d{2}[\s.\-]\d{2}[\s.\-]\d{2}(?!\d)"),
    re.compile(r"(?<!\d)\d{3}[\s.\-]\d{3}[\s.\-]\d{4}(?!\d)"),
    re.compile(r"(?<!\d)\(\d{2,4}\)\s*[\d\s.\-]{6,14}(?!\d)"),
)
_UUID_SLUG_RE = re.compile(r"^[a-f0-9-]{20,}$")
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}")
_IP_RE = re.compile(r"\d{1,3}(?:\.\d{1,3}){3}")
_SVG_COORD_RE = re.compile(r"\d+\.\d+\s+\d+")
_HREF_RE = re.compile(
    r"""href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))""",
    re.IGNORECASE,
)
_URL_RE = re.compile(
    r"https?://[^\s\"'<>]+",
    re.IGNORECASE,
)

_EMAIL_DENY_DOMAINS = frozenset(
    {
        "example.com",
        "example.org",
        "sentry.io",
        "wixpress.com",
        "schema.org",
        "w3.org",
        "googleapis.com",
        "gstatic.com",
        "cloudflare.com",
        "facebook.com/tr",
    }
)

_SOCIAL_HOSTS: list[tuple[str, tuple[str, ...]]] = [
    ("facebook", ("facebook.com", "fb.com", "m.facebook.com")),
    ("instagram", ("instagram.com",)),
    ("linkedin", ("linkedin.com",)),
    ("twitter", ("twitter.com", "x.com")),
    ("tiktok", ("tiktok.com",)),
    ("youtube", ("youtube.com", "youtu.be")),
    ("pinterest", ("pinterest.com", "pin.it")),
    ("whatsapp", ("whatsapp.com", "wa.me", "api.whatsapp.com")),
    ("telegram", ("telegram.org", "t.me")),
    ("snapchat", ("snapchat.com",)),
    ("threads", ("threads.net",)),
    ("yelp", ("yelp.com",)),
    ("tripadvisor", ("tripadvisor.com",)),
]

_TRACKING_PARAMS = frozenset(
    {"utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"}
)

# Generic site paths — not business profile links.
_SOCIAL_PATH_DENY = frozenset(
    {
        "policies",
        "policy",
        "privacy",
        "help",
        "watch",
        "reg",
        "login",
        "signup",
        "sign-up",
        "lite",
        "developers",
        "developer",
        "legal",
        "ads",
        "business",
        "about",
        "dialog",
        "sharer",
        "share",
        "plugins",
        "tr",
        "events",
        "marketplace",
        "gaming",
        "hashtag",
        "reels",
        "stories",
        "explore",
        "accounts",
        "intent",
        "home",
        "search",
        "oauth",
        "l.php",
        "flx",
        "recipes",
        "photo.php",
        "notes",
        "media",
        "directory",
        "places",
        "settings",
        "recover",
        "checkpoint",
        "funding",
        "careers",
        "press",
        "terms",
        "community",
        "blog",
        "api",
        "ajax",
        "connect",
        "terms",
        "terms.php",
        "policy",
        "policy.php",
        "login.php",
        "hacked",
        "creation",
        "communitystandards",
        "policies_center",
        "meta",
        "lifeatmeta",
        "metaforbusiness",
    }
)


def _empty_bundle() -> dict[str, Any]:
    return {"emails": [], "phones": [], "socials": {}}


def _normalize_email(raw: str) -> str | None:
    email = raw.strip().lower()
    if email.startswith("mailto:"):
        email = email[7:].split("?", 1)[0].strip()
    if "@" not in email:
        return None
    local, _, domain = email.partition("@")
    if not local or not domain or "." not in domain:
        return None
    if any(email.endswith(f"@{d}") or f".{d}" in domain for d in _EMAIL_DENY_DOMAINS):
        return None
    if email.endswith("@2x") or email.endswith("@3x"):
        return None
    if re.search(r"\.(png|jpg|jpeg|gif|svg|webp)$", domain):
        return None
    return email


def _looks_like_false_phone(raw: str) -> bool:
    s = raw.strip()
    if not s:
        return True
    if _DATE_RE.match(s):
        return True
    if _IP_RE.search(s):
        return True
    if _SVG_COORD_RE.search(s):
        return True
    if s.count(".") >= 2:
        return True
    digits = re.sub(r"\D", "", s)
    if len(digits) < 8 or len(digits) > 15:
        return True
    # Long digit blobs without phone formatting are usually JS ids / pixel codes.
    if len(digits) >= 9 and not s.lstrip().startswith("+") and not re.search(r"[\s().\-]", s):
        return True
    return False


def _normalize_phone(raw: str) -> str | None:
    s = raw.strip()
    if s.lower().startswith("tel:"):
        s = s[4:].split(";", 1)[0].strip()
    if _looks_like_false_phone(s):
        return None
    return s


def _social_path_ok(platform: str, path: str) -> bool:
    """Keep profile/page URLs; drop generic corporate site links."""
    segments = [seg for seg in (path or "").lower().split("/") if seg]
    if not segments:
        return False
    head = segments[0].split("?")[0]
    if head in _SOCIAL_PATH_DENY:
        return False
    if head.startswith("v") and head[1:].replace(".", "", 1).isdigit():
        return False
    if head == "pages":
        return len(segments) >= 2 and segments[1] not in {"create", "creation"}
    if head in {"profile.php", "pg", "people", "company", "in", "school"}:
        return True
    if platform in {"instagram", "twitter", "tiktok", "threads", "snapchat"} and len(segments) == 1:
        slug = segments[0]
        if slug in _SOCIAL_PATH_DENY or _UUID_SLUG_RE.match(slug):
            return False
        return bool(re.fullmatch(r"[\w.\-]+", slug))
    if platform == "facebook" and len(segments) == 1:
        slug = segments[0]
        if slug in _SOCIAL_PATH_DENY or _UUID_SLUG_RE.match(slug):
            return False
        return bool(re.fullmatch(r"[\w.\-]+", slug))
    if platform == "youtube" and head in {"channel", "c", "user"}:
        return True
    if platform == "linkedin" and head in {"company", "in", "school"}:
        return True
    return False


def _host_matches(host: str, patterns: tuple[str, ...]) -> bool:
    h = host.lower().removeprefix("www.")
    return any(h == p or h.endswith("." + p) for p in patterns)


def _classify_social(url: str) -> tuple[str, str] | None:
    try:
        parsed = urlparse(url.strip())
    except ValueError:
        return None
    if parsed.scheme not in ("http", "https"):
        return None
    host = (parsed.hostname or "").lower()
    if not host:
        return None
    for platform, patterns in _SOCIAL_HOSTS:
        if _host_matches(host, patterns):
            normalized = _normalize_url(url)
            parsed_norm = urlparse(normalized)
            if not _social_path_ok(platform, parsed_norm.path or ""):
                return None
            return platform, normalized
    return None


def _normalize_url(url: str) -> str:
    try:
        p = urlparse(url.strip())
    except ValueError:
        return url.strip()
    q = parse_qs(p.query, keep_blank_values=False)
    filtered = {k: v for k, v in q.items() if k.lower() not in _TRACKING_PARAMS}
    new_query = urlencode(filtered, doseq=True)
    return urlunparse((p.scheme.lower(), (p.hostname or "").lower(), p.path or "", p.params, new_query, ""))


def _decode_text(text: str) -> str:
    decoded = html_lib.unescape(text)
    decoded = decoded.replace("&#64;", "@").replace("&commat;", "@")
    decoded = re.sub(r"<[^>]+>", " ", decoded)
    decoded = re.sub(r"\s+", " ", decoded)
    return decoded


def _add_unique(lst: list[str], value: str | None) -> None:
    if value and value not in lst:
        lst.append(value)


def _add_social(socials: dict[str, list[str]], platform: str, url: str) -> None:
    bucket = socials.setdefault(platform, [])
    if url not in bucket:
        bucket.append(url)


def extract_from_html(text: str) -> dict[str, Any]:
    """Scan HTML for contactable emails, phones, and social URLs."""
    out = _empty_bundle()
    raw = html_lib.unescape(text or "")
    visible = _decode_text(raw)

    for m in _HREF_RE.finditer(raw):
        href = next((g for g in m.groups() if g), "") or ""
        href = html_lib.unescape(href.strip())
        if not href:
            continue
        low = href.lower()
        if low.startswith("mailto:"):
            _add_unique(out["emails"], _normalize_email(href))
        elif low.startswith("tel:"):
            _add_unique(out["phones"], _normalize_phone(href))
        elif low.startswith(("http://", "https://", "//")):
            if href.startswith("//"):
                href = "https:" + href
            hit = _classify_social(href)
            if hit:
                _add_social(out["socials"], hit[0], hit[1])

    for m in _URL_RE.finditer(raw):
        hit = _classify_social(m.group(0))
        if hit:
            _add_social(out["socials"], hit[0], hit[1])

    for m in _EMAIL_RE.finditer(visible):
        _add_unique(out["emails"], _normalize_email(m.group(1)))

    for m in _OBF_EMAIL_RE.finditer(visible):
        candidate = f"{m.group(1)}@{m.group(2)}.{m.group(3)}"
        _add_unique(out["emails"], _normalize_email(candidate))

    for pattern in _PHONE_TEXT_PATTERNS:
        for m in pattern.finditer(visible):
            _add_unique(out["phones"], _normalize_phone(m.group(0)))

    return out


def _merge_contacts(acc: dict[str, Any], page_hits: dict[str, Any]) -> None:
    for email in page_hits.get("emails") or []:
        _add_unique(acc["emails"], email)
    for phone in page_hits.get("phones") or []:
        _add_unique(acc["phones"], phone)
    for platform, urls in (page_hits.get("socials") or {}).items():
        if not isinstance(urls, list):
            continue
        for url in urls:
            if isinstance(url, str):
                _add_social(acc["socials"], str(platform), url)


def _social_count(bundle: dict[str, Any]) -> int:
    return sum(len(v) for v in (bundle.get("socials") or {}).values() if isinstance(v, list))


def _load_targets(place_ids: list[str] | None, limit: int | None) -> list[dict[str, Any]]:
    with session(readonly=True) as c:
        if place_ids:
            marks = ",".join("?" for _ in place_ids)
            sql = (
                "SELECT place_id, name, "
                "json_extract(dynamic, '$.website_crawl') AS wc, "
                "json_extract(dynamic, '$.website_contacts') AS contacts "
                f"FROM places WHERE place_id IN ({marks})"
            )
            params: list[Any] = list(place_ids)
        else:
            sql = (
                "SELECT place_id, name, "
                "json_extract(dynamic, '$.website_crawl') AS wc, "
                "json_extract(dynamic, '$.website_contacts') AS contacts "
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
        try:
            contacts = json.loads(r["contacts"]) if r["contacts"] else None
        except (TypeError, ValueError):
            contacts = None
        if isinstance(wc, dict):
            out.append(
                {
                    "place_id": r["place_id"],
                    "name": r["name"],
                    "website_crawl": wc,
                    "website_contacts": contacts if isinstance(contacts, dict) else None,
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

    targets = _load_targets(place_ids, int(limit) if limit is not None else None)
    log.started(
        total=len(targets),
        scope="extract_contacts",
        place_ids_count=len(place_ids) if place_ids else None,
    )

    if not targets:
        log.info("no crawled places matched; nothing to extract")
        return {"extracted": 0, "skipped": 0, "missing": 0, "failed": 0, "places": 0}

    extracted = skipped = missing = failed = 0
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%fZ")

    for i, t in enumerate(targets):
        if is_cancelled():
            log.warn("cancellation requested; stopping extraction")
            break
        pid = t["place_id"]
        wc = t["website_crawl"]
        if t.get("crawl_from_disk"):
            with session() as c:
                places_repo.merge_dynamic(c, pid, {"website_crawl": wc})
        existing = t.get("website_contacts")
        if (
            isinstance(existing, dict)
            and existing.get("extracted_at")
            and not force
        ):
            skipped += 1
            log.item_start(place_id=pid, name=t["name"])
            log.item_done(
                place_id=pid,
                duration_ms=0,
                outputs={
                    "emails": len(existing.get("emails") or []),
                    "phones": len(existing.get("phones") or []),
                    "socials": _social_count(existing),
                    "skipped": True,
                },
            )
            log.progress(done=i + 1, total=len(targets))
            continue

        pages = [p for p in (wc.get("pages") or []) if isinstance(p, dict)]
        log.item_start(place_id=pid, name=t["name"])
        t_item = time.monotonic()
        bundle = _empty_bundle()
        pages_scanned = 0
        crawl_changed = False
        page_failed = False

        for page in pages:
            html_rel = page.get("html_path")
            if not isinstance(html_rel, str) or not html_rel.strip():
                continue
            html_path = (_MLF / html_rel.strip()).resolve()
            if not html_path.is_file():
                missing += 1
                continue
            try:
                html_text = html_path.read_text(encoding="utf-8", errors="replace")
                hits = extract_from_html(html_text)
                page["contacts"] = hits
                _merge_contacts(bundle, hits)
                pages_scanned += 1
                crawl_changed = True
            except OSError as exc:
                page_failed = True
                log.warn(f"failed reading {html_rel}: {exc}", place_id=pid)

        bundle["extracted_at"] = now
        bundle["pages_scanned"] = pages_scanned

        with session() as c:
            places_repo.merge_dynamic(c, pid, {"website_contacts": bundle})
            if crawl_changed:
                places_repo.merge_dynamic(c, pid, {"website_crawl": wc})

        dur = (time.monotonic() - t_item) * 1000.0
        if page_failed and pages_scanned == 0:
            failed += 1
        else:
            extracted += 1

        log.item_done(
            place_id=pid,
            duration_ms=dur,
            outputs={
                "emails": len(bundle["emails"]),
                "phones": len(bundle["phones"]),
                "socials": _social_count(bundle),
                "pages": pages_scanned,
            },
        )
        log.progress(done=i + 1, total=len(targets))

    summary = {
        "extracted": extracted,
        "skipped": skipped,
        "missing": missing,
        "failed": failed,
        "places": len(targets),
    }
    log.info("done", **summary)
    return summary
