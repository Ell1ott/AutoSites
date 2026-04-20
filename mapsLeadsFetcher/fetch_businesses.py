#!/usr/bin/env python3
"""
Fetch businesses via Google Places API (New) Text Search and save the full API
response to JSON, plus a flattened CSV of lead fields (same run). If the output
JSON already exists, new places are merged in by place id; existing ids are skipped.

Requires: GOOGLE_MAPS_API_KEY with Places API (New) enabled in Google Cloud.

Run: uv run fetch_businesses.py [--query ...] [--output maps_businesses.json]

Defaults bias the search around Sorø, Denmark and rank by distance (Places API).
CSV defaults to maps_businesses.csv next to the JSON; use --no-csv to skip.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"

# Sorø town center (Denmark) — used as default search bias for distance ranking.
SORO_LAT = 55.4318
SORO_LNG = 11.5555


def search_businesses(
    api_key: str,
    text_query: str,
    max_results: int,
    field_mask: str,
    *,
    latitude: float,
    longitude: float,
    radius_m: float,
    rank_by_distance: bool,
    region_code: str | None,
    language_code: str | None,
) -> dict[str, Any]:
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": field_mask,
    }
    body: dict[str, Any] = {
        "textQuery": text_query,
        "pageSize": max_results,
    }
    if rank_by_distance:
        body["rankPreference"] = "DISTANCE"
        body["locationBias"] = {
            "circle": {
                "center": {"latitude": latitude, "longitude": longitude},
                "radius": radius_m,
            }
        }
    if region_code:
        body["regionCode"] = region_code
    if language_code:
        body["languageCode"] = language_code
    response = requests.post(
        PLACES_TEXT_SEARCH_URL,
        headers=headers,
        json=body,
        timeout=60,
    )
    try:
        payload = response.json()
    except json.JSONDecodeError:
        payload = {"raw_text": response.text}

    if not response.ok:
        raise RuntimeError(
            f"Places API error HTTP {response.status_code}: {json.dumps(payload, indent=2)}"
        )
    return payload


def _localizable_text(obj: Any) -> str:
    if isinstance(obj, dict):
        t = obj.get("text")
        if t is not None:
            return str(t)
    return ""


def _open_now_cell(place: dict[str, Any]) -> str:
    for key in ("regularOpeningHours", "currentOpeningHours"):
        block = place.get(key)
        if isinstance(block, dict) and "openNow" in block:
            return "true" if block["openNow"] else "false"
    return ""


def _weekday_hours_cell(place: dict[str, Any]) -> str:
    for key in ("regularOpeningHours", "currentOpeningHours"):
        block = place.get(key)
        if isinstance(block, dict):
            desc = block.get("weekdayDescriptions")
            if isinstance(desc, list) and desc:
                return "; ".join(str(x) for x in desc)
    return ""


def record_to_csv_rows(record: dict[str, Any]) -> list[dict[str, str]]:
    """Flatten wrapped API record into one row per place for CSV export."""
    fetched_at = str(record.get("fetched_at") or "")
    query = str(record.get("query") or "")
    center = record.get("search_center") or {}
    lat0 = center.get("latitude") if isinstance(center, dict) else None
    lng0 = center.get("longitude") if isinstance(center, dict) else None
    lat0_s = "" if lat0 is None else str(lat0)
    lng0_s = "" if lng0 is None else str(lng0)

    api = record.get("api_response")
    if not isinstance(api, dict):
        return []
    places = api.get("places") or []
    rows: list[dict[str, str]] = []

    for place in places:
        if not isinstance(place, dict):
            continue
        loc = place.get("location") or {}
        lat = loc.get("latitude") if isinstance(loc, dict) else None
        lng = loc.get("longitude") if isinstance(loc, dict) else None
        types_raw = place.get("types")
        if isinstance(types_raw, list):
            types_s = " | ".join(str(t) for t in types_raw)
        else:
            types_s = ""

        plus = place.get("plusCode") or {}
        plus_code = ""
        if isinstance(plus, dict):
            plus_code = str(plus.get("globalCode") or plus.get("compoundCode") or "")

        rows.append(
            {
                "fetched_at": fetched_at,
                "search_query": query,
                "search_center_latitude": lat0_s,
                "search_center_longitude": lng0_s,
                "place_id": str(place.get("id") or ""),
                "name": _localizable_text(place.get("displayName")),
                "primary_type": str(place.get("primaryType") or ""),
                "primary_type_label": _localizable_text(place.get("primaryTypeDisplayName")),
                "types": types_s,
                "formatted_address": str(place.get("formattedAddress") or ""),
                "latitude": "" if lat is None else str(lat),
                "longitude": "" if lng is None else str(lng),
                "national_phone": str(place.get("nationalPhoneNumber") or ""),
                "international_phone": str(place.get("internationalPhoneNumber") or ""),
                "rating": "" if place.get("rating") is None else str(place["rating"]),
                "user_rating_count": ""
                if place.get("userRatingCount") is None
                else str(place["userRatingCount"]),
                "price_level": str(place.get("priceLevel") or ""),
                "business_status": str(place.get("businessStatus") or ""),
                "open_now": _open_now_cell(place),
                "weekday_hours": _weekday_hours_cell(place),
                "website": str(place.get("websiteUri") or ""),
                "google_maps_uri": str(place.get("googleMapsUri") or ""),
                "plus_code": plus_code,
            }
        )
    return rows


CSV_FIELDNAMES = [
    "fetched_at",
    "search_query",
    "search_center_latitude",
    "search_center_longitude",
    "place_id",
    "name",
    "primary_type",
    "primary_type_label",
    "types",
    "formatted_address",
    "latitude",
    "longitude",
    "national_phone",
    "international_phone",
    "rating",
    "user_rating_count",
    "price_level",
    "business_status",
    "open_now",
    "weekday_hours",
    "website",
    "google_maps_uri",
    "plus_code",
]


def write_places_csv(path: Path, record: dict[str, Any]) -> int:
    rows = record_to_csv_rows(record)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    return len(rows)


def _load_existing_places(output_path: Path) -> list[dict[str, Any]]:
    """Return places already saved in output_path, or empty list if missing/invalid."""
    if not output_path.is_file():
        return []
    try:
        raw = output_path.read_text(encoding="utf-8")
        data = json.loads(raw)
    except (OSError, json.JSONDecodeError):
        return []
    if not isinstance(data, dict):
        return []
    api = data.get("api_response")
    if not isinstance(api, dict):
        return []
    places = api.get("places") or []
    out: list[dict[str, Any]] = []
    for p in places:
        if isinstance(p, dict):
            out.append(p)
    return out


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fetch businesses from Google Maps (Places API Text Search) and write JSON output."
    )
    parser.add_argument(
        "--query",
        "-q",
        default="businesses",
        help="Search text (e.g. restaurants, coffee shops). Location comes from --lat/--lng bias.",
    )
    parser.add_argument(
        "--lat",
        type=float,
        default=SORO_LAT,
        metavar="DEG",
        help=f"Bias center latitude (default: Sorø, Denmark ≈ {SORO_LAT}).",
    )
    parser.add_argument(
        "--lng",
        type=float,
        default=SORO_LNG,
        metavar="DEG",
        help=f"Bias center longitude (default: Sorø, Denmark ≈ {SORO_LNG}).",
    )
    parser.add_argument(
        "--radius-m",
        type=float,
        default=25_000.0,
        metavar="METERS",
        help="Search bias circle radius in meters (default: 25 km around center).",
    )
    parser.add_argument(
        "--no-distance-rank",
        action="store_true",
        help="Do not set rankPreference=DISTANCE or location bias (relevance-only search).",
    )
    parser.add_argument(
        "--region-code",
        default="DK",
        help="CLDR region code for formatting/biasing (default: DK).",
    )
    parser.add_argument(
        "--language-code",
        default="da",
        help="Preferred language for place details (default: da).",
    )
    parser.add_argument(
        "--count",
        "-n",
        type=int,
        default=10,
        help="Number of places to return (max 20 per request for Text Search).",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=Path("maps_businesses.json"),
        help="Output JSON file path.",
    )
    parser.add_argument(
        "--csv-output",
        type=Path,
        default=None,
        metavar="PATH",
        help="Output CSV path (default: same basename as --output with .csv extension).",
    )
    parser.add_argument(
        "--no-csv",
        action="store_true",
        help="Do not write a CSV file (JSON only).",
    )
    parser.add_argument(
        "--field-mask",
        default="*",
        help=(
            "X-Goog-FieldMask value. Use '*' for all fields (higher cost/latency; fine for dev). "
            "Example narrow mask: places.displayName,places.formattedAddress,places.rating"
        ),
    )
    args = parser.parse_args()

    api_key = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()
    if not api_key:
        print(
            "Error: set environment variable GOOGLE_MAPS_API_KEY to your Google Maps Platform API key.",
            file=sys.stderr,
        )
        sys.exit(1)

    n = max(1, min(args.count, 20))

    use_bias = not args.no_distance_rank

    payload = search_businesses(
        api_key=api_key,
        text_query=args.query,
        max_results=n,
        field_mask=args.field_mask,
        latitude=args.lat,
        longitude=args.lng,
        radius_m=args.radius_m,
        rank_by_distance=use_bias,
        region_code=args.region_code or None,
        language_code=args.language_code or None,
    )

    places = payload.get("places") or []
    existing = _load_existing_places(args.output)
    existing_ids = {
        str(p["id"])
        for p in existing
        if isinstance(p, dict) and p.get("id") is not None
    }

    new_places: list[dict[str, Any]] = []
    skipped = 0
    for p in places:
        if not isinstance(p, dict):
            continue
        pid = p.get("id")
        if pid is not None:
            sid = str(pid)
            if sid in existing_ids:
                skipped += 1
                continue
            existing_ids.add(sid)
        new_places.append(p)

    merged_places = existing + new_places
    merged_payload = dict(payload)
    merged_payload["places"] = merged_places
    record: dict[str, Any] = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "query": args.query,
        "requested_count": n,
        "returned_count": len(places),
        "added_count": len(new_places),
        "skipped_existing_count": skipped,
        "total_places": len(merged_places),
        "search_center": {"latitude": args.lat, "longitude": args.lng},
        "bias_radius_meters": args.radius_m if use_bias else None,
        "rank_preference": "DISTANCE" if use_bias else None,
        "api_response": merged_payload,
    }

    args.output.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(
        f"Added {len(new_places)} new place(s), skipped {skipped} already in file; "
        f"total {len(merged_places)} in {args.output.resolve()}",
        file=sys.stderr,
    )

    if not args.no_csv:
        csv_path = args.csv_output if args.csv_output is not None else args.output.with_suffix(".csv")
        n_csv = write_places_csv(csv_path, record)
        print(f"Wrote {n_csv} row(s) to {csv_path.resolve()}", file=sys.stderr)


if __name__ == "__main__":
    main()
