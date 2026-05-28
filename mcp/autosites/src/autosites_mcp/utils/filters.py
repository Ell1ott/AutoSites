from __future__ import annotations

from typing import Any
from urllib.parse import urlencode

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


def normalize_field_key(key: str) -> str:
    if key.startswith(("dynamic.", "data.")) or key in _TYPED_COLUMNS:
        return key
    return f"dynamic.{key}"


def filters_to_query_params(
    filters: dict[str, Any] | None,
    *,
    sort: dict[str, str] | None = None,
    limit: int | None = None,
    offset: int | None = None,
) -> dict[str, str]:
    """Convert a friendly filter DSL to backend where[key][op]=value params."""
    params: dict[str, str] = {}
    for key, spec in (filters or {}).items():
        field = normalize_field_key(key)
        if not isinstance(spec, dict):
            params[f"where[{field}][eq]"] = _encode_value(spec)
            continue
        for op, value in spec.items():
            op_norm = str(op).lower()
            if op_norm in ("exists", "notexists"):
                if value in (False, 0, "false", "0", "no"):
                    op_norm = "notexists" if op_norm == "exists" else "exists"
                params[f"where[{field}][{op_norm}]"] = "1"
            elif op_norm == "in":
                if isinstance(value, list):
                    params[f"where[{field}][in]"] = ",".join(str(v) for v in value)
                else:
                    params[f"where[{field}][in]"] = str(value)
            elif op_norm in ("eq", "ne", "gt", "gte", "lt", "lte", "like"):
                params[f"where[{field}][{op_norm}]"] = _encode_value(value)
            else:
                # Unknown op — pass through for backend to accept or reject.
                params[f"where[{field}][{op_norm}]"] = _encode_value(value)

    if sort:
        sort_key = normalize_field_key(sort.get("key", "name"))
        direction = "ASC" if sort.get("dir", "asc") == "asc" else "DESC"
        params["order_by"] = sort_key
        params["direction"] = direction
    if limit is not None:
        params["limit"] = str(limit)
    if offset is not None:
        params["offset"] = str(offset)
    return params


def filters_to_query_string(
    filters: dict[str, Any] | None,
    *,
    sort: dict[str, str] | None = None,
    limit: int | None = None,
    offset: int | None = None,
) -> str:
    params = filters_to_query_params(filters, sort=sort, limit=limit, offset=offset)
    return urlencode(params)


def _encode_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)
