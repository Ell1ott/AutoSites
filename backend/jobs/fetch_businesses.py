"""Fetch businesses via the Google Places API (New) Text Search and persist them
to SQLite. Port of mapsLeadsFetcher/fetch_businesses.py — same API surface,
different sink (SQLite instead of JSON file) and emits structured events.

Public entry: `run(args, log)`. Used by `workers/handlers/fetch_leads.py`.
"""
from __future__ import annotations

import math
import os
import time
from typing import Any, Callable

import requests

from db.connection import session
from db.repos import places, fields as fields_repo

PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
TEXT_SEARCH_PAGE_SIZE_CAP = 20
MAX_TEXT_SEARCH_AGGREGATED = 100

DEFAULT_FIELD_MASK = "*"

# Sorø town centre (Denmark) — default search bias, same as the legacy script.
DEFAULT_LAT = 55.4318
DEFAULT_LNG = 11.5555


class FetchArgs:
    """Lightweight typed view over the args dict."""

    def __init__(self, raw: dict[str, Any]) -> None:
        self.query: str = str(raw.get("query") or "").strip()
        self.lat: float = float(raw.get("lat") if raw.get("lat") is not None else DEFAULT_LAT)
        self.lng: float = float(raw.get("lng") if raw.get("lng") is not None else DEFAULT_LNG)
        self.radius_m: float = float(raw.get("radius_m") or 25_000)
        self.rank_by_distance: bool = bool(raw.get("rank_by_distance", True))
        self.region_code: str | None = (raw.get("region_code") or "DK") or None
        self.language_code: str | None = (raw.get("language_code") or "da") or None
        self.count: int = int(raw.get("count") or 10)
        self.field_mask: str = str(raw.get("field_mask") or DEFAULT_FIELD_MASK)
        # cancel check is injected by the runner
        cancel = raw.get("__cancel__")
        self.is_cancelled: Callable[[], bool] = cancel if callable(cancel) else (lambda: False)


def _circle_bounding_rectangle(lat: float, lng: float, radius_m: float) -> dict[str, Any]:
    """Text Search `locationRestriction` only supports rectangle, not circle."""
    delta_lat = radius_m / 111_320.0
    cos_lat = max(math.cos(math.radians(lat)), 1e-6)
    delta_lng = radius_m / (111_320.0 * cos_lat)
    return {
        "rectangle": {
            "low": {"latitude": lat - delta_lat, "longitude": lng - delta_lng},
            "high": {"latitude": lat + delta_lat, "longitude": lng + delta_lng},
        }
    }


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6_371_000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(min(1.0, a)))


def _place_within_circle(place: dict[str, Any], lat: float, lng: float, radius_m: float) -> bool:
    loc = place.get("location") or {}
    plat = loc.get("latitude")
    plng = loc.get("longitude")
    if plat is None or plng is None:
        return False
    try:
        return _haversine_m(lat, lng, float(plat), float(plng)) <= radius_m
    except (TypeError, ValueError):
        return False


def run(args: dict[str, Any], log) -> dict[str, Any]:  # noqa: ANN001 - JobLogger
    a = FetchArgs(args)
    if not a.query:
        raise ValueError("query is required")
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    if not api_key:
        raise RuntimeError("GOOGLE_MAPS_API_KEY is not set")

    want = max(1, min(a.count, MAX_TEXT_SEARCH_AGGREGATED))
    log.started(total=want, query=a.query, lat=a.lat, lng=a.lng, radius_m=a.radius_m)

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": a.field_mask,
    }
    common: dict[str, Any] = {"textQuery": a.query}
    circle = {
        "center": {"latitude": a.lat, "longitude": a.lng},
        "radius": a.radius_m,
    }
    if a.rank_by_distance:
        common["rankPreference"] = "DISTANCE"
        # Text Search supports rectangle restriction only (not circle). Use the
        # circle's bounding box, then post-filter to the exact radius below.
        common["locationRestriction"] = _circle_bounding_rectangle(a.lat, a.lng, a.radius_m)
    else:
        common["locationBias"] = {"circle": circle}
    if a.region_code:
        common["regionCode"] = a.region_code
    if a.language_code:
        common["languageCode"] = a.language_code

    page_token: str | None = None
    fetched: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    pages = 0
    max_pages = 10
    while len(fetched) < want and pages < max_pages:
        if a.is_cancelled():
            log.warn("cancellation requested; stopping pagination")
            break
        pages += 1
        body = dict(common)
        body["pageSize"] = TEXT_SEARCH_PAGE_SIZE_CAP
        if page_token:
            body["pageToken"] = page_token

        t0 = time.monotonic()
        resp = requests.post(PLACES_TEXT_SEARCH_URL, headers=headers, json=body, timeout=60)
        duration_ms = (time.monotonic() - t0) * 1000.0
        log.http_call(host="places.googleapis.com", status=resp.status_code, duration_ms=duration_ms)
        if not resp.ok:
            raise RuntimeError(f"Places API HTTP {resp.status_code}: {resp.text[:500]}")
        payload = resp.json()
        batch = payload.get("places") or []
        log.progress(done=len(fetched), total=want, page_size=len(batch))
        for p in batch:
            if not isinstance(p, dict):
                continue
            place_id = p.get("id")
            if not place_id or place_id in seen_ids:
                continue
            if a.rank_by_distance and not _place_within_circle(p, a.lat, a.lng, a.radius_m):
                continue
            seen_ids.add(str(place_id))
            fetched.append(p)
            if len(fetched) >= want:
                break
        next_tok = payload.get("nextPageToken")
        if not next_tok or not batch:
            break
        page_token = str(next_tok)

    fetched = fetched[:want]
    if a.rank_by_distance and len(fetched) < want:
        log.info(
            f"strict radius filter kept {len(fetched)} of {want} requested place(s)",
            in_radius=len(fetched),
            requested=want,
        )
    log.info(f"fetched {len(fetched)} place(s); writing to DB")

    # Build the AI-task name set so we partition incoming fields the same way
    # migrate_from_json.py does — anything matching a task name lands in
    # `dynamic`, the rest stays in `data`.
    with session() as c:
        rows = c.execute("SELECT name FROM ai_tasks").fetchall()
        ai_task_names = {r["name"] for r in rows}

        added = 0
        updated = 0
        skipped = 0
        for i, place in enumerate(fetched):
            if a.is_cancelled():
                log.warn("cancellation requested; stopping write")
                break
            place_id = place.get("id")
            if not place_id:
                skipped += 1
                continue
            dn = place.get("displayName")
            name = dn.get("text") if isinstance(dn, dict) else (dn if isinstance(dn, str) else None)
            rating = place.get("rating")
            try:
                rating = float(rating) if rating is not None else None
            except (TypeError, ValueError):
                rating = None
            rc = place.get("userRatingCount")
            try:
                review_count = int(rc) if rc is not None else None
            except (TypeError, ValueError):
                review_count = None

            dynamic_part = {k: v for k, v in place.items() if k in ai_task_names}
            data_part = {k: v for k, v in place.items() if k not in ai_task_names}

            existed = c.execute(
                "SELECT 1 FROM places WHERE place_id = ?", (place_id,)
            ).fetchone() is not None

            log.item_start(place_id=place_id, name=name)
            t_item = time.monotonic()
            places.upsert(
                c,
                place_id=place_id,
                name=name,
                rating=rating,
                review_count=review_count,
                website=place.get("websiteUri"),
                business_status=place.get("businessStatus"),
                data=data_part,
                dynamic=dynamic_part,
            )
            dur = (time.monotonic() - t_item) * 1000.0
            loc = place.get("location") or {}
            log.item_done(
                place_id=place_id,
                duration_ms=dur,
                outputs={
                    "new": not existed,
                    "name": name,
                    "lat": loc.get("latitude"),
                    "lng": loc.get("longitude"),
                },
            )
            if existed:
                updated += 1
            else:
                added += 1
            log.progress(done=i + 1, total=len(fetched))

    fields_repo.invalidate()
    summary = {
        "requested": want,
        "fetched": len(fetched),
        "added": added,
        "updated": updated,
        "skipped": skipped,
    }
    log.info("done", **summary)
    return summary
