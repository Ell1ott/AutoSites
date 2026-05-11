"""AI run history (read-only)."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from api.deps import Auth, get_db_ro
from db.repos import ai_runs

router = APIRouter(prefix="/ai-runs", tags=["ai-runs"])


@router.get("", dependencies=[Auth])
def list_runs(
    task: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    db=Depends(get_db_ro),
) -> dict[str, Any]:
    return {"items": ai_runs.list_recent(db, task=task, limit=limit)}


@router.get("/{run_id}", dependencies=[Auth])
def get_run(run_id: str, db=Depends(get_db_ro)) -> dict[str, Any]:
    r = ai_runs.get(db, run_id)
    if not r:
        raise HTTPException(status_code=404, detail="run not found")
    return r
