"""Leads (places) + schema-discovery routes."""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse

from api.deps import Auth, get_db, get_db_ro
from api.filters import parse_query
from db.repos import ai_outputs_log, fields, job_logs, places

router = APIRouter(prefix="", tags=["leads"])

# routes(0) -> api(1) -> backend(2) -> repo root(3)
SCREENSHOTS_DIR = Path(
    os.environ.get("AUTOSITES_SCREENSHOTS_DIR")
    or Path(__file__).resolve().parents[3] / "mapsLeadsFetcher" / "screenshots"
).resolve()


@router.get("/fields", dependencies=[Auth])
def list_fields(force: bool = False, db=Depends(get_db_ro)) -> dict[str, Any]:
    """Schema discovery. Returns indexed columns and discovered `dynamic.*` keys
    with type/coverage/sample. Cached for 60s on the server; pass `?force=true`
    to refresh."""
    return fields.discover(db, force=force)


@router.get("/leads", dependencies=[Auth])
def list_leads(
    request: Request,
    db=Depends(get_db_ro),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    order_by: str = Query("name"),
    direction: str = Query("ASC"),
) -> dict[str, Any]:
    qp = dict(request.query_params.multi_items())
    # multi_items gives list of (key, value); collapse to multidict
    grouped: dict[str, list[str]] = {}
    for k, v in request.query_params.multi_items():
        grouped.setdefault(k, []).append(v)
    # drop pagination/order params from filter parse
    for reserved in ("limit", "offset", "order_by", "direction"):
        grouped.pop(reserved, None)
    try:
        where_sql, params = parse_query(grouped)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    order_col = _safe_order(order_by)
    rows = places.list_(
        db,
        where_sql=where_sql,
        params=params,
        order_by=order_col,
        direction=direction,
        limit=limit,
        offset=offset,
    )
    for r in rows:
        pid = r.get("place_id")
        if isinstance(pid, str):
            r["has_screenshot"] = (SCREENSHOTS_DIR / f"{pid}.png").is_file()
            r["has_markdown"] = (SCREENSHOTS_DIR / f"{pid}.md").is_file()
    total = places.count(db, where_sql=where_sql, params=params)
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": rows,
    }


@router.get("/leads/{place_id}", dependencies=[Auth])
def get_lead(place_id: str, db=Depends(get_db_ro)) -> dict[str, Any]:
    row = places.get(db, place_id)
    if not row:
        raise HTTPException(status_code=404, detail="place not found")
    row["ai_history"] = ai_outputs_log.history(db, place_id=place_id, limit=50)
    return row


@router.get("/leads/{place_id}/screenshot")
def get_lead_screenshot(place_id: str):
    """Serve `{place_id}.png` from the on-disk screenshots dir. No auth — this
    is consumed by `<img>` tags which can't send a Bearer header; the place_id
    is the access identifier."""
    candidate = (SCREENSHOTS_DIR / f"{place_id}.png").resolve()
    if not candidate.is_relative_to(SCREENSHOTS_DIR) or not candidate.is_file():
        raise HTTPException(status_code=404, detail="screenshot not found")
    return FileResponse(candidate, media_type="image/png")


@router.patch("/leads/{place_id}", dependencies=[Auth])
def patch_lead(place_id: str, body: dict[str, Any], db=Depends(get_db)) -> dict[str, Any]:
    """Body: `{ set: { ... } }` merges keys into `dynamic`, except `lead_score`
    which updates the typed column (1–10 or null)."""
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="body must be an object")
    patch = body.get("set")
    if not isinstance(patch, dict) or not patch:
        raise HTTPException(status_code=400, detail="body.set must be a non-empty object")
    existing = places.get(db, place_id)
    if not existing:
        raise HTTPException(status_code=404, detail="place not found")
    dynamic_only: dict[str, Any] = {}
    for key, val in patch.items():
        if key == "lead_score":
            if val is None:
                places.set_lead_score(db, place_id, None)
            else:
                try:
                    s = int(val)
                except (TypeError, ValueError):
                    raise HTTPException(
                        status_code=400,
                        detail="lead_score must be an integer from 1 to 10 or null",
                    )
                if not 1 <= s <= 10:
                    raise HTTPException(
                        status_code=400,
                        detail="lead_score must be between 1 and 10",
                    )
                places.set_lead_score(db, place_id, s)
        else:
            dynamic_only[key] = val
    if dynamic_only:
        places.merge_dynamic(db, place_id, dynamic_only)
    fields.invalidate()
    return places.get(db, place_id)


def _safe_order(order_by: str) -> str:
    """Allow typed columns or `dynamic.<key>` / `data.<key>` JSON paths."""
    if order_by in {
        "place_id", "name", "rating", "review_count", "website",
        "business_status", "lead_score", "created_at", "updated_at",
    }:
        return order_by
    if order_by.startswith("dynamic."):
        key = order_by.split(".", 1)[1]
        if key and key.replace("_", "").isalnum() and not key[0].isdigit():
            return f"json_extract(dynamic, '$.{key}')"
    if order_by.startswith("data."):
        key = order_by.split(".", 1)[1]
        if key and key.replace("_", "").isalnum() and not key[0].isdigit():
            return f"json_extract(data, '$.{key}')"
    return "name"
