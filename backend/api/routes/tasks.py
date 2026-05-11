"""AI task definitions CRUD."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from api.deps import Auth, get_db, get_db_ro
from db.repos import ai_tasks

router = APIRouter(prefix="/ai-tasks", tags=["ai-tasks"])


@router.get("", dependencies=[Auth])
def list_tasks(db=Depends(get_db_ro)) -> dict[str, Any]:
    return {"items": ai_tasks.list_all(db)}


@router.get("/{name}", dependencies=[Auth])
def get_task(name: str, db=Depends(get_db_ro)) -> dict[str, Any]:
    t = ai_tasks.get(db, name)
    if not t:
        raise HTTPException(status_code=404, detail="task not found")
    return t


@router.post("", dependencies=[Auth])
def create_task(body: dict[str, Any], db=Depends(get_db)) -> dict[str, Any]:
    name = body.get("name")
    if not isinstance(name, str) or not name:
        raise HTTPException(status_code=400, detail="name is required")
    config = body.get("config")
    if not isinstance(config, dict):
        raise HTTPException(status_code=400, detail="config must be an object")
    ai_tasks.upsert(
        db,
        name=name,
        label=body.get("label"),
        config=config,
        enabled=bool(body.get("enabled", True)),
        sort_order=int(body.get("sort_order") or 0),
    )
    return ai_tasks.get(db, name)  # type: ignore[return-value]


@router.patch("/{name}", dependencies=[Auth])
def update_task(name: str, body: dict[str, Any], db=Depends(get_db)) -> dict[str, Any]:
    existing = ai_tasks.get(db, name)
    if not existing:
        raise HTTPException(status_code=404, detail="task not found")
    config = body.get("config", existing["config"])
    if not isinstance(config, dict):
        raise HTTPException(status_code=400, detail="config must be an object")
    ai_tasks.upsert(
        db,
        name=name,
        label=body.get("label", existing.get("label")),
        config=config,
        enabled=bool(body.get("enabled", existing.get("enabled", True))),
        sort_order=int(body.get("sort_order", existing.get("sort_order", 0))),
    )
    return ai_tasks.get(db, name)  # type: ignore[return-value]
