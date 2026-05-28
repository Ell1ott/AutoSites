"""AI run history (read-only)."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from api.deps import Auth, get_db_ro
from db.repos import ai_outputs_log, ai_runs

router = APIRouter(prefix="/ai-runs", tags=["ai-runs"])

log_router = APIRouter(prefix="/ai-outputs-log", tags=["ai-outputs-log"])


@log_router.get("/{log_id}", dependencies=[Auth])
def get_ai_call(log_id: int, db=Depends(get_db_ro)) -> dict[str, Any]:
    """Return the full prompt + raw response + (base64) screenshot for one
    AI call. Backs the "AI call" detail modal in task logs."""
    row = ai_outputs_log.get(db, log_id)
    if not row:
        raise HTTPException(status_code=404, detail="ai_outputs_log row not found")
    return row


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
