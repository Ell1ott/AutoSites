"""Schema discovery: scan `places.dynamic` + `places.data` (raw Google JSON)
keys + indexed columns + override metadata, return a unified field list for
the client to render filters and table columns."""
from __future__ import annotations

import json
import sqlite3
import time
from typing import Any

# Indexed/typed columns visible to the client. `data` (raw Google) and
# `dynamic` (the JSON column) are excluded — `data` is opaque, `dynamic` is
# discovered key-by-key below.
_TYPED_COLUMNS: list[tuple[str, str]] = [
    ("place_id", "string"),
    ("name", "string"),
    ("rating", "number"),
    ("review_count", "integer"),
    ("website", "string"),
    ("business_status", "string"),
    ("lead_score", "integer"),
    ("created_at", "string"),
    ("updated_at", "string"),
]

_CACHE: dict[str, Any] = {"at": 0.0, "value": None}
_TTL_SECONDS = 60.0


def discover(conn: sqlite3.Connection, *, force: bool = False) -> dict[str, Any]:
    now = time.time()
    if not force and _CACHE["value"] is not None and (now - _CACHE["at"]) < _TTL_SECONDS:
        return _CACHE["value"]

    total = conn.execute("SELECT COUNT(*) FROM places").fetchone()[0] or 0

    columns: list[dict[str, Any]] = []
    for name, type_ in _TYPED_COLUMNS:
        cov = conn.execute(
            f"SELECT COUNT(*) FROM places WHERE {name} IS NOT NULL"
        ).fetchone()[0]
        columns.append(
            {
                "key": name,
                "type": type_,
                "source": "column",
                "coverage": (cov / total) if total else 0.0,
            }
        )

    # Discover dynamic.* keys by reading the JSON column row-by-row and parsing
    # in Python. This sidesteps several SQLite quirks where json_each cross-joins
    # over a recently-mutated JSON column produce spurious "malformed JSON" errors,
    # and gives us true booleans (SQLite collapses JSON true/false to integer 1/0).
    by_key: dict[str, dict[str, Any]] = {}
    samples: dict[str, Any] = {}
    for row in conn.execute("SELECT dynamic FROM places"):
        raw = row["dynamic"]
        if not raw:
            continue
        try:
            obj = json.loads(raw)
        except (TypeError, ValueError):
            continue
        if not isinstance(obj, dict):
            continue
        for key, value in obj.items():
            type_ = _infer_python_type(value)
            slot = by_key.setdefault(
                key, {"key": key, "source": "dynamic", "types": {}, "n": 0}
            )
            slot["types"][type_] = slot["types"].get(type_, 0) + 1
            slot["n"] += 1
            samples.setdefault(key, value)

    dynamic: list[dict[str, Any]] = []
    for slot in by_key.values():
        types = slot["types"]
        primary = max(types.items(), key=lambda x: x[1])[0]
        sample = samples.get(slot["key"])
        if isinstance(sample, str) and len(sample) > 200:
            sample = sample[:200] + "…"
        coverage = (slot["n"] / total) if total else 0.0
        entry: dict[str, Any] = {
            "key": slot["key"],
            "type": primary,
            "source": "dynamic",
            "coverage": coverage,
            "sample": sample,
        }
        if len(types) > 1:
            entry["types_seen"] = types
        dynamic.append(entry)

    dynamic.sort(key=lambda d: -d["coverage"])

    # --- Raw `data` column (Google Places payload): top-level keys only -------
    by_data_key: dict[str, dict[str, Any]] = {}
    samples_data: dict[str, Any] = {}
    for row in conn.execute("SELECT data FROM places"):
        raw = row["data"]
        if not raw:
            continue
        try:
            obj = json.loads(raw)
        except (TypeError, ValueError):
            continue
        if not isinstance(obj, dict):
            continue
        for key, value in obj.items():
            type_ = _infer_python_type(value)
            slot = by_data_key.setdefault(
                key, {"key": key, "source": "data", "types": {}, "n": 0}
            )
            slot["types"][type_] = slot["types"].get(type_, 0) + 1
            slot["n"] += 1
            samples_data.setdefault(key, value)

    data_fields: list[dict[str, Any]] = []
    for slot in by_data_key.values():
        types = slot["types"]
        primary = max(types.items(), key=lambda x: x[1])[0]
        sample = samples_data.get(slot["key"])
        if isinstance(sample, str) and len(sample) > 200:
            sample = sample[:200] + "…"
        coverage = (slot["n"] / total) if total else 0.0
        entry: dict[str, Any] = {
            "key": slot["key"],
            "type": primary,
            "source": "data",
            "coverage": coverage,
            "sample": sample,
        }
        if len(types) > 1:
            entry["types_seen"] = types
        data_fields.append(entry)

    data_fields.sort(key=lambda d: -d["coverage"])

    # Apply field_meta overrides (display name, format, filterable/editable flags).
    meta_rows = conn.execute(
        "SELECT key, display, format, filterable, editable, enum_values FROM field_meta"
    ).fetchall()
    overrides = {}
    for r in meta_rows:
        d = dict(r)
        if d.get("enum_values"):
            try:
                d["enum_values"] = json.loads(d["enum_values"])
            except (TypeError, ValueError):
                d["enum_values"] = None
        overrides[d["key"]] = d

    for entry in columns:
        ov = overrides.get(entry["key"])
        if ov:
            _apply_override(entry, ov)
    for entry in dynamic:
        ov = overrides.get(f"dynamic.{entry['key']}") or overrides.get(entry["key"])
        if ov:
            _apply_override(entry, ov)
    for entry in data_fields:
        ov = overrides.get(f"data.{entry['key']}") or overrides.get(entry["key"])
        if ov:
            _apply_override(entry, ov)

    for entry in dynamic:
        if entry["key"] == "discard_score":
            entry.setdefault("display", "Discard score")
            entry["format"] = "discard-score"
            break

    out = {"total": total, "columns": columns, "dynamic": dynamic, "data_fields": data_fields}
    _CACHE["at"] = now
    _CACHE["value"] = out
    return out


def invalidate() -> None:
    _CACHE["at"] = 0.0
    _CACHE["value"] = None


def _infer_python_type(value: Any) -> str:
    """JSON-style type tag for a value parsed by `json.loads`. `bool` is checked
    before `int` because `bool` is a subclass of `int` in Python."""
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, int):
        return "integer"
    if isinstance(value, float):
        return "number"
    if isinstance(value, str):
        return "string"
    if isinstance(value, list):
        return "array"
    if isinstance(value, dict):
        return "object"
    return "unknown"


def _apply_override(entry: dict[str, Any], ov: dict[str, Any]) -> None:
    if ov.get("display"):
        entry["display"] = ov["display"]
    if ov.get("format"):
        entry["format"] = ov["format"]
    entry["filterable"] = bool(ov.get("filterable", 1))
    entry["editable"] = bool(ov.get("editable", 1))
    if ov.get("enum_values"):
        entry["enum_values"] = ov["enum_values"]
