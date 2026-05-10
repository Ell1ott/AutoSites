"""Leads (places) + schema-discovery routes."""
from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from api.deps import Auth, get_db, get_db_ro
from api.filters import parse_query
from db.repos import ai_outputs_log, fields, job_logs, places

router = APIRouter(prefix="", tags=["leads"])


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


@router.patch("/leads/{place_id}", dependencies=[Auth])
def patch_lead(place_id: str, body: dict[str, Any], db=Depends(get_db)) -> dict[str, Any]:
    """Body: `{set: {key: value, ...}}` merges into `dynamic`. Anything else is
    ignored — the typed columns are owned by the fetch handler."""
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="body must be an object")
    patch = body.get("set")
    if not isinstance(patch, dict) or not patch:
        raise HTTPException(status_code=400, detail="body.set must be a non-empty object")
    existing = places.get(db, place_id)
    if not existing:
        raise HTTPException(status_code=404, detail="place not found")
    places.merge_dynamic(db, place_id, patch)
    fields.invalidate()
    return places.get(db, place_id)


def _safe_order(order_by: str) -> str:
    """Allow either a typed column or `dynamic.<key>` path. Falls back to `name`."""
    if order_by in {
        "place_id", "name", "rating", "review_count", "website",
        "business_status", "lead_score", "created_at", "updated_at",
    }:
        return order_by
    if order_by.startswith("dynamic."):
        key = order_by.split(".", 1)[1]
        if key.replace("_", "").isalnum():
            return f"json_extract(dynamic, '$.{key}')"
    return "name"
