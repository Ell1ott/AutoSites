"""Translate ?where[<key>][<op>]=<value> query params into SQL WHERE fragments.

Supported keys:
  - Indexed columns (place_id, name, rating, review_count, website,
    business_status, lead_score, created_at, updated_at)
  - `dynamic.<key>` — json_extract(dynamic, '$.<key>')
  - `data.<key>` — json_extract(data, '$.<key>')  (raw Google JSON blob)
  - Bare `<key>` — legacy synonym for dynamic.<key>

Supported operators:
  eq, ne, gt, gte, lt, lte, like, in, exists, notexists

Values are passed as parameters (no string interpolation) so this is safe against
SQL injection. Keys must match an allowlist.
"""
from __future__ import annotations

import re
from typing import Any

_JSON_KEY = re.compile(
    r"^[a-zA-Z][a-zA-Z0-9_]*$"
)  # Google / dynamic keys: letters, digits, underscore (camelCase ok)

_TYPED_COLUMNS = {
    "place_id",
    "name",
    "rating",
    "review_count",
    "website",
    "business_status",
    "lead_score",
    "created_at",
    "updated_at",
}

# Operators that need a typed cast on the column for numeric comparisons against
# dynamic JSON values. Without this, '7' (text) compares lexically to '10' and
# wrong rows come back.
_NUMERIC_OPS = {"gt", "gte", "lt", "lte"}

_OP_SQL = {
    "eq": "=",
    "ne": "!=",
    "gt": ">",
    "gte": ">=",
    "lt": "<",
    "lte": "<=",
    "like": "LIKE",
}


def _json_subkey(field: str, prefix: str) -> str | None:
    if not field.startswith(prefix):
        return None
    sub = field[len(prefix) :]
    if _JSON_KEY.fullmatch(sub):
        return sub
    return None


def _valid_field(field: str) -> bool:
    if field in _TYPED_COLUMNS:
        return True
    if _json_subkey(field, "data.") is not None:
        return True
    if _json_subkey(field, "dynamic.") is not None:
        return True
    return bool(_JSON_KEY.fullmatch(field))


def parse_query(qs: dict[str, list[str]]) -> tuple[str, list[Any]]:
    """`qs` is the parsed query string with one or more values per key.
    Returns `(where_sql, params)` joined with `AND`. Empty filters -> `('', [])`.

    Accepts both flat dict (single value per key) and multi-dict.
    """
    clauses: list[str] = []
    params: list[Any] = []

    # Normalize qs to {key: [values...]} so callers can pass either form.
    norm: dict[str, list[str]] = {}
    for k, v in qs.items():
        if isinstance(v, list):
            norm[k] = v
        else:
            norm[k] = [v]

    for raw_key, values in norm.items():
        m = re.fullmatch(r"where\[([^\]]+)\]\[([a-z]+)\]", raw_key)
        if not m:
            continue
        field, op = m.group(1), m.group(2)
        if not _valid_field(field):
            raise ValueError(f"invalid filter field: {field!r}")
        if op not in {*_OP_SQL.keys(), "in", "exists", "notexists"}:
            raise ValueError(f"unsupported operator: {op!r}")
        for value in values:
            clause, ps = _build_one(field, op, value)
            clauses.append(clause)
            params.extend(ps)

    if not clauses:
        return "", []
    return " AND ".join(clauses), params


def _discard_score_expr(*, numeric: bool = False) -> str:
    expr = "json_extract(dynamic, '$.discard_score.score')"
    if numeric:
        return f"CAST({expr} AS REAL)"
    return expr


def _is_discard_score_field(field: str) -> bool:
    return field == "discard_score" or _json_subkey(field, "dynamic.") == "discard_score"


def _col_expr(field: str, *, numeric: bool = False) -> str:
    if _is_discard_score_field(field):
        return _discard_score_expr(numeric=numeric)
    if field in _TYPED_COLUMNS:
        return field
    sk = _json_subkey(field, "data.")
    if sk is not None:
        expr = f"json_extract(data, '$.{sk}')"
        if numeric:
            expr = f"CAST({expr} AS REAL)"
        return expr
    sk = _json_subkey(field, "dynamic.")
    if sk is not None:
        expr = f"json_extract(dynamic, '$.{sk}')"
        if numeric:
            expr = f"CAST({expr} AS REAL)"
        return expr
    if _JSON_KEY.fullmatch(field):
        expr = f"json_extract(dynamic, '$.{field}')"
        if numeric:
            expr = f"CAST({expr} AS REAL)"
        return expr
    raise ValueError(f"unsupported filter field: {field!r}")


def _build_one(field: str, op: str, value: str) -> tuple[str, list[Any]]:
    if op == "exists":
        return f"{_col_expr(field)} IS NOT NULL", []
    if op == "notexists":
        return f"{_col_expr(field)} IS NULL", []
    if op == "in":
        # comma-separated list of values
        parts = [v.strip() for v in value.split(",") if v.strip()]
        if not parts:
            return "1=0", []
        placeholders = ",".join("?" * len(parts))
        return f"{_col_expr(field)} IN ({placeholders})", parts
    sql_op = _OP_SQL.get(op)
    if sql_op is None:
        raise ValueError(f"unsupported operator: {op!r}")
    numeric = op in _NUMERIC_OPS
    expr = _col_expr(field, numeric=numeric)
    coerced = _coerce_value(value, op, numeric)
    return f"{expr} {sql_op} ?", [coerced]


def _coerce_value(value: str, op: str, numeric: bool) -> Any:
    if numeric:
        try:
            return float(value)
        except (TypeError, ValueError):
            return value
    if op == "eq" and value.lower() in ("true", "false"):
        return 1 if value.lower() == "true" else 0
    return value
