"""Jobs queue repository."""
from __future__ import annotations

import json
import sqlite3
import uuid
from typing import Any


def enqueue(conn: sqlite3.Connection, *, kind: str, args: dict[str, Any]) -> str:
    job_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO jobs (id, kind, status, args) VALUES (?, ?, 'queued', ?)",
        (job_id, kind, json.dumps(args)),
    )
    return job_id


def claim_next(conn: sqlite3.Connection) -> dict[str, Any] | None:
    """Atomically pick the oldest queued job and mark it running. Returns the row
    or None. Worker calls this in a loop."""
    row = conn.execute(
        "SELECT id, kind, args FROM jobs WHERE status='queued' "
        "ORDER BY created_at LIMIT 1"
    ).fetchone()
    if row is None:
        return None
    cur = conn.execute(
        "UPDATE jobs SET status='running', "
        "started_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') "
        "WHERE id=? AND status='queued'",
        (row["id"],),
    )
    if cur.rowcount != 1:
        # someone else beat us to it
        return None
    return {"id": row["id"], "kind": row["kind"], "args": json.loads(row["args"] or "{}")}


def get(conn: sqlite3.Connection, job_id: str) -> dict[str, Any] | None:
    row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    if row is None:
        return None
    d = dict(row)
    for k in ("args", "progress", "result"):
        if d.get(k):
            try:
                d[k] = json.loads(d[k])
            except (TypeError, ValueError):
                pass
    return d


def list_recent(
    conn: sqlite3.Connection,
    *,
    kind: str | None = None,
    status: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    sql = "SELECT id, kind, status, created_at, started_at, finished_at FROM jobs"
    where: list[str] = []
    params: list[Any] = []
    if kind:
        where.append("kind = ?")
        params.append(kind)
    if status:
        where.append("status = ?")
        params.append(status)
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    return [dict(r) for r in conn.execute(sql, params).fetchall()]


def set_progress(conn: sqlite3.Connection, job_id: str, progress: dict[str, Any]) -> None:
    conn.execute("UPDATE jobs SET progress = ? WHERE id = ?", (json.dumps(progress), job_id))


def mark_done(
    conn: sqlite3.Connection, job_id: str, *, result: dict[str, Any] | None = None
) -> None:
    conn.execute(
        "UPDATE jobs SET status='done', result=?, "
        "finished_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
        (json.dumps(result or {}), job_id),
    )


def mark_failed(conn: sqlite3.Connection, job_id: str, *, error: str) -> None:
    conn.execute(
        "UPDATE jobs SET status='failed', error=?, "
        "finished_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
        (error, job_id),
    )


def mark_cancelled(conn: sqlite3.Connection, job_id: str) -> None:
    conn.execute(
        "UPDATE jobs SET status='cancelled', "
        "finished_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
        (job_id,),
    )


def request_cancel(conn: sqlite3.Connection, job_id: str) -> bool:
    """Returns True if the job was queued/running and cancellation was requested."""
    cur = conn.execute(
        "UPDATE jobs SET cancel_requested = 1 WHERE id = ? "
        "AND status IN ('queued','running')",
        (job_id,),
    )
    return cur.rowcount > 0


def is_cancel_requested(conn: sqlite3.Connection, job_id: str) -> bool:
    row = conn.execute(
        "SELECT cancel_requested FROM jobs WHERE id = ?", (job_id,)
    ).fetchone()
    return bool(row and row["cancel_requested"])
