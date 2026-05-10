"""Places (leads) repository.

Hot scalars live in indexed columns (`name`, `rating`, `review_count`, `website`,
`business_status`, `lead_score`). Everything else lives in `data` (raw Google response,
immutable) or `dynamic` (everything we add over time, sparse, JSON).

Adding a new field is just a write to `dynamic` via `set_dynamic` — no migration.
"""
from __future__ import annotations

import json
import sqlite3
from typing import Any, Iterable


def upsert(
    conn: sqlite3.Connection,
    *,
    place_id: str,
    name: str | None,
    rating: float | None,
    review_count: int | None,
    website: str | None,
    business_status: str | None,
    data: dict[str, Any],
    dynamic: dict[str, Any] | None = None,
    lead_score: int | None = None,
) -> None:
    """Insert or replace a place's typed columns + raw `data`. Preserves `dynamic`
    on existing rows unless an explicit non-None `dynamic` is provided (in which
    case it's merged in)."""
    existing = conn.execute(
        "SELECT dynamic, lead_score FROM places WHERE place_id = ?", (place_id,)
    ).fetchone()
    if existing is None:
        merged_dynamic = json.dumps(dynamic or {})
        kept_score = lead_score
    else:
        prev = json.loads(existing["dynamic"] or "{}")
        if dynamic:
            prev.update(dynamic)
        merged_dynamic = json.dumps(prev)
        kept_score = lead_score if lead_score is not None else existing["lead_score"]

    conn.execute(
        """
        INSERT INTO places (place_id, name, rating, review_count, website,
                            business_status, lead_score, data, dynamic, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        ON CONFLICT(place_id) DO UPDATE SET
            name=excluded.name,
            rating=excluded.rating,
            review_count=excluded.review_count,
            website=excluded.website,
            business_status=excluded.business_status,
            lead_score=excluded.lead_score,
            data=excluded.data,
            dynamic=excluded.dynamic,
            updated_at=excluded.updated_at
        """,
        (
            place_id,
            name,
            rating,
            review_count,
            website,
            business_status,
            kept_score,
            json.dumps(data),
            merged_dynamic,
        ),
    )


def set_dynamic(
    conn: sqlite3.Connection, place_id: str, key: str, value: Any
) -> None:
    """Merge one key into the dynamic JSON object. Adding a new field never
    requires a migration; it goes through here."""
    conn.execute(
        """
        UPDATE places
        SET dynamic = json_set(coalesce(dynamic, '{}'), ?, json(?)),
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE place_id = ?
        """,
        (f"$.{key}", json.dumps(value), place_id),
    )


def merge_dynamic(
    conn: sqlite3.Connection, place_id: str, patch: dict[str, Any]
) -> None:
    """Merge multiple keys at once."""
    if not patch:
        return
    # Build a chained json_set() expression.
    expr = "coalesce(dynamic, '{}')"
    params: list[Any] = []
    for key, value in patch.items():
        expr = f"json_set({expr}, ?, json(?))"
        params.append(f"$.{key}")
        params.append(json.dumps(value))
    params.append(place_id)
    conn.execute(
        f"UPDATE places SET dynamic = {expr}, "
        "updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE place_id = ?",
        params,
    )


def set_lead_score(conn: sqlite3.Connection, place_id: str, score: int | None) -> None:
    conn.execute(
        "UPDATE places SET lead_score = ?, "
        "updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE place_id = ?",
        (score, place_id),
    )


def get(conn: sqlite3.Connection, place_id: str) -> dict[str, Any] | None:
    row = conn.execute("SELECT * FROM places WHERE place_id = ?", (place_id,)).fetchone()
    return _row_to_dict(row) if row else None


def list_(
    conn: sqlite3.Connection,
    *,
    where_sql: str = "",
    params: Iterable[Any] = (),
    order_by: str = "name",
    direction: str = "ASC",
    limit: int = 50,
    offset: int = 0,
) -> list[dict[str, Any]]:
    direction = "DESC" if direction.upper() == "DESC" else "ASC"
    sql = "SELECT * FROM places"
    if where_sql:
        sql += f" WHERE {where_sql}"
    # `order_by` can be an indexed column or a json_extract expression — the caller
    # is responsible for safe construction.
    sql += f" ORDER BY {order_by} {direction} LIMIT ? OFFSET ?"
    rows = conn.execute(sql, (*params, limit, offset)).fetchall()
    return [_row_to_dict(r) for r in rows]


def count(conn: sqlite3.Connection, *, where_sql: str = "", params: Iterable[Any] = ()) -> int:
    sql = "SELECT COUNT(*) FROM places"
    if where_sql:
        sql += f" WHERE {where_sql}"
    return conn.execute(sql, tuple(params)).fetchone()[0]


def _row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    d = dict(row)
    d["data"] = json.loads(d.get("data") or "{}")
    d["dynamic"] = json.loads(d.get("dynamic") or "{}")
    return d
