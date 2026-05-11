"""Jobs API: enqueue, rich snapshot, live SSE stream, cancel.

The SSE stream is the centerpiece of the dashboard's real-time view. On connect
it replays past events from `job_logs` (with `?since=<seq>` for resume), then
subscribes to a live in-memory queue that the worker's UDS push fills.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse, Response, StreamingResponse

from api.deps import Auth, get_db, get_db_ro
from db.repos import job_logs, jobs as jobs_repo
from workers import exporter

logger = logging.getLogger("backend.routes.jobs")

router = APIRouter(prefix="/jobs", tags=["jobs"])


_VALID_KINDS = {"fetch_leads", "ai_task", "crawl", "html_to_md"}


@router.post("", dependencies=[Auth])
def enqueue(body: dict[str, Any], db=Depends(get_db)) -> dict[str, Any]:
    kind = body.get("kind")
    if not isinstance(kind, str) or kind not in _VALID_KINDS:
        raise HTTPException(status_code=400, detail=f"kind must be one of {sorted(_VALID_KINDS)}")
    args = body.get("args") or {}
    if not isinstance(args, dict):
        raise HTTPException(status_code=400, detail="args must be an object")
    job_id = jobs_repo.enqueue(db, kind=kind, args=args)
    return {"id": job_id, "kind": kind, "status": "queued"}


@router.get("", dependencies=[Auth])
def list_jobs(
    kind: str | None = None,
    status: str | None = None,
    limit: int = Query(50, ge=1, le=500),
    db=Depends(get_db_ro),
) -> dict[str, Any]:
    return {"items": jobs_repo.list_recent(db, kind=kind, status=status, limit=limit)}


@router.get("/{job_id}", dependencies=[Auth])
def get_job(job_id: str, db=Depends(get_db_ro)) -> dict[str, Any]:
    job = jobs_repo.get(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="job not found")
    metrics = job_logs.aggregate_metrics(db, job_id)
    last_events = job_logs.last_n(db, job_id, n=50)
    current_item = None
    if job["status"] == "running":
        current_item = job_logs.current_item(db, job_id)
    last_error = None
    for ev in reversed(last_events):
        if ev.get("event") == "error":
            last_error = ev
            break
    return {
        **job,
        "metrics": metrics,
        "current_item": current_item,
        "last_events": last_events,
        "last_error": last_error,
    }


@router.get("/{job_id}/events", dependencies=[Auth])
def get_events(
    job_id: str,
    since: int = 0,
    event: str | None = None,
    level: str | None = None,
    limit: int = Query(500, ge=1, le=5000),
    db=Depends(get_db_ro),
) -> dict[str, Any]:
    job = jobs_repo.get(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="job not found")
    events_tuple = tuple(event.split(",")) if event else None
    levels_tuple = tuple(level.split(",")) if level else None
    rows = job_logs.tail(
        db, job_id, since_id=since, events=events_tuple, levels=levels_tuple, limit=limit
    )
    return {
        "items": rows,
        "next_since": rows[-1]["id"] if rows else since,
    }


@router.get("/{job_id}/stream")
async def stream_job(
    request: Request,
    job_id: str,
    since: int = 0,
    level: str | None = None,
) -> StreamingResponse:
    """SSE live tail. Replays from `since`, then streams new events as they arrive.

    Authentication: SSE in browsers can't send custom headers from EventSource, so
    we accept the bearer token via `?token=` as a fallback when not provided via
    Authorization header.
    """
    # Token can come via header or ?token= (EventSource compat).
    import os
    expected = os.environ.get("BACKEND_AUTH_TOKEN")
    if expected:
        auth_h = request.headers.get("authorization", "")
        token = request.query_params.get("token") or ""
        provided = ""
        if auth_h.lower().startswith("bearer "):
            provided = auth_h.split(None, 1)[1].strip()
        elif token:
            provided = token
        if provided != expected:
            raise HTTPException(status_code=401, detail="invalid token")

    bus = getattr(request.app.state, "event_bus", None)
    levels_tuple = tuple(level.split(",")) if level else None

    async def gen():
        # 1. Subscribe FIRST so we don't miss events that fire between replay and tail.
        queue = bus.subscribe(job_id) if bus is not None else None
        try:
            yield ": connected\n\n"

            # 2. Replay anything since the cursor.
            from db.connection import connect
            conn = connect(readonly=True)
            try:
                last_seen = since
                while True:
                    batch = job_logs.tail(
                        conn, job_id, since_id=last_seen, levels=levels_tuple, limit=500
                    )
                    if not batch:
                        break
                    for ev in batch:
                        yield _sse_format(ev)
                        last_seen = ev["id"]
            finally:
                conn.close()

            # 3. Live tail. If we have a live event bus, drain its queue. Otherwise
            # fall back to short DB polls — slightly higher latency but no events
            # are ever lost because every event is persisted in job_logs.
            poll_seen = last_seen
            while True:
                if await request.is_disconnected():
                    break
                if queue is not None:
                    try:
                        ev = await asyncio.wait_for(queue.get(), timeout=15.0)
                    except asyncio.TimeoutError:
                        yield ": heartbeat\n\n"
                        continue
                    if levels_tuple and ev.get("level") not in levels_tuple:
                        continue
                    yield _sse_format(ev)
                else:
                    await asyncio.sleep(0.5)
                    conn = connect(readonly=True)
                    try:
                        batch = job_logs.tail(
                            conn, job_id, since_id=poll_seen, levels=levels_tuple, limit=200
                        )
                    finally:
                        conn.close()
                    if not batch:
                        # Periodic heartbeat in fallback mode too.
                        yield ": heartbeat\n\n"
                        continue
                    for ev in batch:
                        yield _sse_format(ev)
                        poll_seen = ev["id"]
        finally:
            if queue is not None and bus is not None:
                bus.unsubscribe(job_id, queue)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{job_id}/export", dependencies=[Auth])
def export_job(
    job_id: str,
    format: str = Query("markdown", regex="^(markdown|json)$"),
    event: int | None = None,
    db=Depends(get_db_ro),
):
    """Paste-ready bundle for an AI coding agent.

    - `?event=<id>` focuses on one event (typically an `error`) with the events
      leading up to it. Best for "fix this failure" prompts.
    - No `event` dumps the whole job — best for "what happened here?" prompts.
    """
    try:
        body, media = exporter.build_export(db, job_id, event_id=event, fmt=format)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return Response(content=body, media_type=media)


@router.post("/{job_id}/cancel", dependencies=[Auth])
def cancel_job(job_id: str, db=Depends(get_db)) -> dict[str, Any]:
    if not jobs_repo.request_cancel(db, job_id):
        raise HTTPException(status_code=404, detail="job not found or already finished")
    return {"id": job_id, "cancel_requested": True}


def _sse_format(ev: dict[str, Any]) -> str:
    event = ev.get("event") or "message"
    data = json.dumps(ev, default=str, ensure_ascii=False)
    return f"event: {event}\ndata: {data}\n\n"
