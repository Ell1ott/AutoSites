"""Append-only log of AI outputs. The materialized current value lives in
`places.dynamic.<task>`; this table is the audit trail."""
from __future__ import annotations

import json
import sqlite3
from typing import Any


def append(
    conn: sqlite3.Connection,
    *,
    place_id: str,
    task: str,
    value: Any,
    model: str | None = None,
    run_id: str | None = None,
) -> int:
    cur = conn.execute(
        "INSERT INTO ai_outputs_log (place_id, task, value, model, run_id) "
        "VALUES (?, ?, ?, ?, ?)",
        (place_id, task, json.dumps(value), model, run_id),
    )
    return int(cur.lastrowid)


def history(
    conn: sqlite3.Connection, *, place_id: str, task: str | None = None, limit: int = 50
) -> list[dict[str, Any]]:
    sql = "SELECT id, place_id, task, value, model, run_id, created_at FROM ai_outputs_log WHERE place_id = ?"
    params: list[Any] = [place_id]
    if task:
        sql += " AND task = ?"
        params.append(task)
    sql += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    rows = conn.execute(sql, params).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        try:
            d["value"] = json.loads(d["value"])
        except (TypeError, ValueError):
            pass
        out.append(d)
    return out
