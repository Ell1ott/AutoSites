"""AI task definitions (replaces settings.json)."""
from __future__ import annotations

import json
import sqlite3
from typing import Any


def upsert(
    conn: sqlite3.Connection,
    *,
    name: str,
    label: str | None,
    config: dict[str, Any],
    enabled: bool = True,
    sort_order: int = 0,
) -> None:
    conn.execute(
        """
        INSERT INTO ai_tasks (name, label, config, enabled, sort_order, updated_at)
        VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        ON CONFLICT(name) DO UPDATE SET
          label=excluded.label,
          config=excluded.config,
          enabled=excluded.enabled,
          sort_order=excluded.sort_order,
          updated_at=excluded.updated_at
        """,
        (name, label, json.dumps(config), 1 if enabled else 0, sort_order),
    )


def get(conn: sqlite3.Connection, name: str) -> dict[str, Any] | None:
    row = conn.execute("SELECT * FROM ai_tasks WHERE name = ?", (name,)).fetchone()
    if row is None:
        return None
    d = dict(row)
    try:
        d["config"] = json.loads(d["config"])
    except (TypeError, ValueError):
        d["config"] = {}
    d["enabled"] = bool(d["enabled"])
    return d


def list_all(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute(
        "SELECT * FROM ai_tasks ORDER BY sort_order, name"
    ).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        try:
            d["config"] = json.loads(d["config"])
        except (TypeError, ValueError):
            d["config"] = {}
        d["enabled"] = bool(d["enabled"])
        out.append(d)
    return out
