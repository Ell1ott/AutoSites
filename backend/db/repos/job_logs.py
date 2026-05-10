"""Structured event log per job. Append-only.

Each row is one structured event (`event` typed, `data` JSON). The dashboard
reads this to render every panel: progress bar, per-item table, error list,
cost gauge, live tail.
"""
from __future__ import annotations

import json
import sqlite3
from typing import Any


def append(
    conn: sqlite3.Connection,
    *,
    job_id: str,
    seq: int,
    ts: str,
    level: str = "info",
    event: str,
    message: str = "",
    data: dict[str, Any] | None = None,
) -> int:
    cur = conn.execute(
        "INSERT INTO job_logs (job_id, seq, ts, level, event, message, data) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (job_id, seq, ts, level, event, message, json.dumps(data or {})),
    )
    return int(cur.lastrowid)


def next_seq(conn: sqlite3.Connection, job_id: str) -> int:
    row = conn.execute(
        "SELECT COALESCE(MAX(seq), 0) + 1 FROM job_logs WHERE job_id = ?", (job_id,)
    ).fetchone()
    return int(row[0])


def tail(
    conn: sqlite3.Connection,
    job_id: str,
    *,
    since_id: int = 0,
    levels: tuple[str, ...] | None = None,
    events: tuple[str, ...] | None = None,
    limit: int = 500,
) -> list[dict[str, Any]]:
    """Return events with id > since_id, oldest first. Used for both initial replay
    and post-reconnect catch-up."""
    sql = "SELECT id, seq, ts, level, event, message, data FROM job_logs WHERE job_id = ? AND id > ?"
    params: list[Any] = [job_id, since_id]
    if levels:
        sql += f" AND level IN ({','.join('?' * len(levels))})"
        params.extend(levels)
    if events:
        sql += f" AND event IN ({','.join('?' * len(events))})"
        params.extend(events)
    sql += " ORDER BY id ASC LIMIT ?"
    params.append(limit)
    rows = conn.execute(sql, params).fetchall()
    out: list[dict[str, Any]] = []
    for r in rows:
        d = dict(r)
        try:
            d["data"] = json.loads(d.get("data") or "{}")
        except (TypeError, ValueError):
            d["data"] = {}
        out.append(d)
    return out


def last_n(conn: sqlite3.Connection, job_id: str, n: int = 50) -> list[dict[str, Any]]:
    sql = (
        "SELECT id, seq, ts, level, event, message, data FROM job_logs "
        "WHERE job_id = ? ORDER BY id DESC LIMIT ?"
    )
    rows = conn.execute(sql, (job_id, n)).fetchall()
    out: list[dict[str, Any]] = []
    for r in reversed(rows):
        d = dict(r)
        try:
            d["data"] = json.loads(d.get("data") or "{}")
        except (TypeError, ValueError):
            d["data"] = {}
        out.append(d)
    return out


def find_by_id(conn: sqlite3.Connection, job_id: str, log_id: int) -> dict[str, Any] | None:
    row = conn.execute(
        "SELECT id, seq, ts, level, event, message, data FROM job_logs "
        "WHERE job_id = ? AND id = ?",
        (job_id, log_id),
    ).fetchone()
    if not row:
        return None
    d = dict(row)
    try:
        d["data"] = json.loads(d.get("data") or "{}")
    except (TypeError, ValueError):
        d["data"] = {}
    return d


def aggregate_metrics(conn: sqlite3.Connection, job_id: str) -> dict[str, Any]:
    """Roll up metrics from `metric`, `ai_call_done`, `item_done` events for
    the rich snapshot in GET /jobs/:id."""
    rows = conn.execute(
        "SELECT event, data FROM job_logs WHERE job_id = ? "
        "AND event IN ('metric','ai_call_done','item_done','error','warn')",
        (job_id,),
    ).fetchall()
    ai_calls = 0
    tokens_in = 0
    tokens_out = 0
    cost_usd = 0.0
    item_durations: list[float] = []
    errors = 0
    warnings = 0
    custom: dict[str, float] = {}
    for r in rows:
        try:
            d = json.loads(r["data"] or "{}")
        except (TypeError, ValueError):
            d = {}
        ev = r["event"]
        if ev == "ai_call_done":
            ai_calls += 1
            tokens_in += int(d.get("tokens_in") or 0)
            tokens_out += int(d.get("tokens_out") or 0)
            try:
                cost_usd += float(d.get("cost_usd") or 0)
            except (TypeError, ValueError):
                pass
        elif ev == "item_done":
            try:
                item_durations.append(float(d.get("duration_ms") or 0))
            except (TypeError, ValueError):
                pass
        elif ev == "error":
            errors += 1
        elif ev == "warn":
            warnings += 1
        elif ev == "metric":
            key = d.get("key")
            try:
                val = float(d.get("value") or 0)
            except (TypeError, ValueError):
                continue
            if isinstance(key, str):
                custom[key] = custom.get(key, 0.0) + val
    avg_item_ms = (sum(item_durations) / len(item_durations)) if item_durations else None
    return {
        "ai_calls": ai_calls,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "estimated_cost_usd": round(cost_usd, 6) if cost_usd else 0.0,
        "avg_item_duration_ms": avg_item_ms,
        "items_done": len(item_durations),
        "errors": errors,
        "warnings": warnings,
        "custom": custom,
    }


def current_item(conn: sqlite3.Connection, job_id: str) -> dict[str, Any] | None:
    """Find the most recent `item_start` whose matching `item_done` hasn't fired yet."""
    rows = conn.execute(
        "SELECT id, ts, event, data FROM job_logs WHERE job_id = ? "
        "AND event IN ('item_start','item_done') ORDER BY id DESC LIMIT 50",
        (job_id,),
    ).fetchall()
    seen_done: set[str] = set()
    for r in rows:
        try:
            d = json.loads(r["data"] or "{}")
        except (TypeError, ValueError):
            d = {}
        pid = d.get("place_id")
        if r["event"] == "item_done" and pid:
            seen_done.add(pid)
        elif r["event"] == "item_start" and pid and pid not in seen_done:
            return {"place_id": pid, "name": d.get("name"), "started_at": r["ts"]}
    return None
