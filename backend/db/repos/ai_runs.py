"""AI run history (replaces runs.json)."""
from __future__ import annotations

import json
import sqlite3
from typing import Any


def upsert(
    conn: sqlite3.Connection,
    *,
    run_id: str,
    task: str | None = None,
    started_at: str | None = None,
    finished_at: str | None = None,
    status: str | None = None,
    args: dict[str, Any] | None = None,
    counts: dict[str, Any] | None = None,
    error: str | None = None,
) -> None:
    conn.execute(
        """
        INSERT INTO ai_runs (run_id, task, started_at, finished_at, status, args, counts, error)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(run_id) DO UPDATE SET
          task=COALESCE(excluded.task, ai_runs.task),
          started_at=COALESCE(excluded.started_at, ai_runs.started_at),
          finished_at=COALESCE(excluded.finished_at, ai_runs.finished_at),
          status=COALESCE(excluded.status, ai_runs.status),
          args=COALESCE(excluded.args, ai_runs.args),
          counts=COALESCE(excluded.counts, ai_runs.counts),
          error=COALESCE(excluded.error, ai_runs.error)
        """,
        (
            run_id,
            task,
            started_at,
            finished_at,
            status,
            json.dumps(args) if args is not None else None,
            json.dumps(counts) if counts is not None else None,
            error,
        ),
    )


def get(conn: sqlite3.Connection, run_id: str) -> dict[str, Any] | None:
    row = conn.execute("SELECT * FROM ai_runs WHERE run_id = ?", (run_id,)).fetchone()
    if row is None:
        return None
    return _row_to_dict(row)


def list_recent(
    conn: sqlite3.Connection, *, task: str | None = None, limit: int = 100
) -> list[dict[str, Any]]:
    sql = "SELECT * FROM ai_runs"
    params: list[Any] = []
    if task:
        sql += " WHERE task = ?"
        params.append(task)
    sql += " ORDER BY started_at DESC LIMIT ?"
    params.append(limit)
    return [_row_to_dict(r) for r in conn.execute(sql, params).fetchall()]


def _row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    d = dict(row)
    for k in ("args", "counts"):
        if d.get(k):
            try:
                d[k] = json.loads(d[k])
            except (TypeError, ValueError):
                pass
    return d
