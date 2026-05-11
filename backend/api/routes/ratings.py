"""Lead score (1-10) management."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from api.deps import Auth, get_db
from db.repos import places

router = APIRouter(prefix="", tags=["ratings"])


@router.put("/leads/{place_id}/rating", dependencies=[Auth])
def set_rating(place_id: str, body: dict[str, Any], db=Depends(get_db)) -> dict[str, Any]:
    raw = body.get("score") if isinstance(body, dict) else None
    if raw is None:
        places.set_lead_score(db, place_id, None)
        return {"place_id": place_id, "lead_score": None}
    try:
        score = int(raw)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="score must be an integer or null")
    if not (1 <= score <= 10):
        raise HTTPException(status_code=400, detail="score must be between 1 and 10")
    existing = places.get(db, place_id)
    if not existing:
        raise HTTPException(status_code=404, detail="place not found")
    places.set_lead_score(db, place_id, score)
    return {"place_id": place_id, "lead_score": score}
