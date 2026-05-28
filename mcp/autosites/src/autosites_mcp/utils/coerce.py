"""Lenient parsing for MCP tool arguments (agents often send the wrong JSON shape).

Accepts strings, dicts, lists, numbers, and common aliases; normalizes to the shapes
the backend client expects.
"""
from __future__ import annotations

import json
import re
from typing import Any
from urllib.parse import parse_qs, unquote_plus

# Backend filter ops (see backend/api/filters.py).
_FILTER_OPS = frozenset(
    {"eq", "ne", "gt", "gte", "lt", "lte", "like", "in", "exists", "notexists"}
)

# Mongo-style / SQL aliases → canonical op.
_OP_ALIASES: dict[str, str] = {
    "==": "eq",
    "=": "eq",
    "equals": "eq",
    "equal": "eq",
    "!=": "ne",
    "<>": "ne",
    "not_equal": "ne",
    "notequal": "ne",
    "nequal": "ne",
    ">": "gt",
    "greater": "gt",
    "greater_than": "gt",
    "greaterthan": "gt",
    ">=": "gte",
    "ge": "gte",
    "greater_or_equal": "gte",
    "greaterorequal": "gte",
    "<": "lt",
    "less": "lt",
    "less_than": "lt",
    "lessthan": "lt",
    "<=": "lte",
    "le": "lte",
    "less_or_equal": "lte",
    "lessorequal": "lte",
    "contains": "like",
    "matches": "like",
    "match": "like",
    "ilike": "like",
    "startswith": "like",
    "endswith": "like",
    "is_null": "notexists",
    "isnull": "notexists",
    "null": "notexists",
    "missing": "notexists",
    "is_not_null": "exists",
    "isnotnull": "exists",
    "not_null": "exists",
    "notnull": "exists",
    "present": "exists",
    "has": "exists",
    "any": "exists",
    "not_empty": "exists",
    "empty": "notexists",
    "none": "notexists",
}

# $gte style (Mongo) → canonical.
_MONGO_OP = re.compile(r"^\$(\w+)$")

_WHERE_BRACKET = re.compile(
    r"^where\[([^\]]+)\]\[([a-zA-Z_]+)\](?:=(.*))?$",
    re.IGNORECASE,
)

# Meta keys for clause objects — not lead field names like "name".
_CLAUSE_META_KEYS = frozenset({"key", "field", "column"})
_CLAUSE_KEYS = _CLAUSE_META_KEYS | frozenset({"name"})  # "name" only when paired with op/value
_OP_KEYS = frozenset({"op", "operator", "operation", "compare"})
_VALUE_KEYS = frozenset({"value", "val", "v", "values"})


def _is_empty(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str) and not value.strip():
        return True
    if isinstance(value, (dict, list)) and len(value) == 0:
        return True
    return False


def _normalize_op(raw: Any) -> str | None:
    if raw is None:
        return None
    s = str(raw).strip().lower().replace(" ", "_")
    if not s:
        return None
    if s in _FILTER_OPS:
        return s
    if s in _OP_ALIASES:
        return _OP_ALIASES[s]
    m = _MONGO_OP.match(s)
    if m:
        inner = m.group(1).lower()
        if inner in _FILTER_OPS:
            return inner
        if inner in _OP_ALIASES:
            return _OP_ALIASES[inner]
    return None


def _parse_json_maybe(value: Any, *, max_depth: int = 4) -> Any:
    """Parse JSON strings; unwrap double-encoded JSON up to max_depth."""
    current = value
    for _ in range(max_depth):
        if not isinstance(current, str):
            return current
        text = current.strip()
        if not text:
            return None
        try:
            current = json.loads(text)
        except json.JSONDecodeError:
            return current
    return current


def coerce_json_object(
    value: Any,
    *,
    field_name: str = "value",
    allow_empty: bool = False,
) -> dict[str, Any] | None:
    """Normalize patch/args/body-style input to a dict or None."""
    if _is_empty(value):
        return None if allow_empty else {}

    parsed = _parse_json_maybe(value)
    if isinstance(parsed, dict):
        # Common agent wrappers.
        for wrap in ("set", "patch", "body", "data", "payload", "args", "input"):
            inner = parsed.get(wrap)
            if isinstance(inner, dict) and len(parsed) == 1:
                return dict(inner)
        return dict(parsed)

    if isinstance(parsed, list):
        out: dict[str, Any] = {}
        for item in parsed:
            if not isinstance(item, dict):
                continue
            k = (
                item.get("key")
                or item.get("field")
                or item.get("name")
                or item.get("column")
            )
            if k is None:
                continue
            v = item.get("value", item.get("val"))
            if v is None and len(item) == 2:
                # {key: value} pair style in a list
                other_key = next((x for x in item if x not in ("key", "field", "name", "column")), None)
                if other_key:
                    k = other_key
                    v = item[other_key]
            out[str(k)] = v
        if out:
            return out
        raise ValueError(f"{field_name} list did not contain usable key/value entries")

    if isinstance(parsed, str):
        # key=value&key2=value2 (not filter brackets)
        if "=" in parsed and "[" not in parsed:
            try:
                qs = parse_qs(parsed, keep_blank_values=True)
                flat = {k: (v[0] if len(v) == 1 else v) for k, v in qs.items()}
                if flat:
                    return flat
            except Exception:
                pass

    raise ValueError(
        f"{field_name} must be a JSON object (dict), JSON string, or list of field entries; "
        f"got {type(parsed).__name__}"
    )


def coerce_json_array(
    value: Any,
    *,
    field_name: str = "value",
    item_type: type = str,
) -> list[Any]:
    """Normalize place_ids and similar to a non-empty list."""
    if _is_empty(value):
        raise ValueError(f"{field_name} is required")

    parsed = _parse_json_maybe(value)
    if isinstance(parsed, list):
        items = list(parsed)
    elif isinstance(parsed, str):
        # Comma-separated fallback.
        items = [p.strip() for p in parsed.split(",") if p.strip()]
    elif isinstance(parsed, (int, float)):
        items = [parsed]
    else:
        raise ValueError(
            f"{field_name} must be a JSON array, comma-separated string, or list; "
            f"got {type(parsed).__name__}"
        )

    if not items:
        raise ValueError(f"{field_name} must not be empty")

    if item_type is str:
        return [str(x).strip() for x in items if str(x).strip()]

    out: list[Any] = []
    for x in items:
        if item_type is int:
            out.append(int(x))
        elif item_type is float:
            out.append(float(x))
        else:
            out.append(x)
    return out


def _merge_filter_dict(target: dict[str, Any], source: dict[str, Any]) -> None:
    for key, spec in source.items():
        k = str(key).strip()
        if not k or k.lower() in ("filters", "filter", "where", "clauses", "clause", "query"):
            continue
        if k in ("sort", "order", "order_by", "orderby", "direction", "sort_dir", "sortdir"):
            continue
        if isinstance(spec, dict):
            existing = target.get(k)
            if isinstance(existing, dict):
                merged = dict(existing)
                merged.update(spec)
                target[k] = merged
            else:
                target[k] = dict(spec)
        else:
            target[k] = spec


def _clause_to_filter_entry(clause: dict[str, Any]) -> tuple[str, Any] | None:
    key = None
    for k in _CLAUSE_KEYS:
        if k in clause and clause[k] is not None:
            key = str(clause[k]).strip()
            break
    if not key:
        # Single-key shorthand: {"lead_score": 7} handled elsewhere.
        return None

    op = None
    for k in _OP_KEYS:
        if k in clause and clause[k] is not None:
            op = _normalize_op(clause[k])
            break

    value: Any = None
    has_value = False
    for k in _VALUE_KEYS:
        if k in clause:
            value = clause[k]
            has_value = True
            break

    if op is None:
        # Infer from value shape.
        if isinstance(value, dict) and len(value) == 1:
            only_op, only_val = next(iter(value.items()))
            op = _normalize_op(only_op)
            value = only_val
            has_value = True
        elif not has_value and len(clause) == 2:
            # {key, exists: true} style
            for candidate in clause:
                if candidate not in _CLAUSE_KEYS and candidate not in _VALUE_KEYS:
                    op = _normalize_op(candidate)
                    if op in ("exists", "notexists"):
                        return key, {op: True}
                    value = clause[candidate]
                    has_value = True
                    break

    if op is None:
        op = "eq"

    if op in ("exists", "notexists"):
        if has_value and value in (False, 0, "false", "0", "no"):
            op = "notexists" if op == "exists" else "exists"
        return key, {op: True}

    if not has_value:
        return key, {"exists": True}

    return key, {op: value}


def _dict_to_filters(obj: dict[str, Any]) -> dict[str, Any]:
    """Convert one dict layer to filter DSL {field: {op: value}}."""
    out: dict[str, Any] = {}

    # Admin-style clause list under common keys.
    for clauses_key in ("clauses", "clause", "filters", "where"):
        nested = obj.get(clauses_key)
        if isinstance(nested, list):
            for item in nested:
                if isinstance(item, dict):
                    entry = _clause_to_filter_entry(item)
                    if entry:
                        k, spec = entry
                        _merge_filter_dict(out, {k: spec})
            if out:
                return out

    for key, spec in obj.items():
        k = str(key).strip()
        kl = k.lower()

        if kl in ("filters", "filter", "where", "clauses", "clause", "query"):
            if isinstance(spec, (dict, list, str)):
                return coerce_filters(spec)
            continue

        if kl in ("sort", "order") and isinstance(spec, dict):
            continue

        # Single clause object (must look like a clause, not a filter map).
        if kl in _CLAUSE_META_KEYS or "op" in obj or "operator" in obj:
            entry = _clause_to_filter_entry(obj)
            if entry:
                fk, fspec = entry
                return {fk: fspec}

        if isinstance(spec, dict):
            # Mongo $gte / operator aliases as keys.
            if all(_normalize_op(subk) or str(subk).startswith("$") for subk in spec):
                normalized: dict[str, Any] = {}
                for subk, subv in spec.items():
                    op = _normalize_op(subk) or _normalize_op(str(subk).lstrip("$"))
                    if op:
                        if op in ("exists", "notexists"):
                            if subv in (False, 0, "false", "0", "no"):
                                op = "notexists" if op == "exists" else "exists"
                            normalized[op] = True
                        else:
                            normalized[op] = subv
                    else:
                        normalized[str(subk)] = subv
                if normalized:
                    out[k] = normalized
                    continue

            # Already {gte: 7} shape.
            if any(_normalize_op(subk) for subk in spec):
                normalized = {}
                for subk, subv in spec.items():
                    op = _normalize_op(subk)
                    if op:
                        normalized[op] = subv
                    else:
                        normalized[str(subk)] = subv
                out[k] = normalized
                continue

            # Nested filter object — recurse one level.
            inner = _dict_to_filters(spec)
            _merge_filter_dict(out, inner)
            continue

        # Bare value → eq.
        if spec is None:
            out[k] = {"notexists": True}
        elif spec in (True, "true", "yes", 1, "1"):
            out[k] = {"exists": True}
        elif spec in (False, "false", "no", 0, "0"):
            out[k] = {"notexists": True}
        else:
            out[k] = {"eq": spec}

    return out


def _decode_query_value(val: str) -> str:
    """Decode URL-encoded values but keep literal % wildcards (e.g. %cafe%)."""
    if not val or "%" not in val:
        return val
    # LIKE-style patterns: leave untouched.
    if val.count("%") >= 2 or val.startswith("%") or val.endswith("%"):
        return val
    if re.search(r"%[0-9A-Fa-f]{2}", val):
        return unquote_plus(val)
    return val


def _parse_where_query_string(text: str) -> dict[str, Any]:
    """Parse where[field][op]=value query strings (URL-encoded or plain)."""
    text = text.strip()
    if not text:
        return {}

    # Allow leading ?.
    if text.startswith("?"):
        text = text[1:]

    out: dict[str, Any] = {}

    # Split on & (prefer manual parse so literal % in values is preserved).
    for part in re.split(r"&+", text):
        part = part.strip()
        if not part:
            continue
        m = _WHERE_BRACKET.match(part.split("=", 1)[0] if "=" in part else part)
        if not m:
            # where[field][op]=value — value may be outside the bracket match.
            m2 = re.match(
                r"^where\[([^\]]+)\]\[([a-zA-Z_]+)\]=(.*)$",
                part,
                re.IGNORECASE,
            )
            if not m2:
                continue
            field, op_raw, val = m2.group(1), m2.group(2), m2.group(3)
        else:
            field, op_raw = m.group(1), m.group(2)
            val = m.group(3)
            if val is None and "=" in part:
                val = part.split("=", 1)[1]
        op = _normalize_op(op_raw)
        if not op:
            continue
        val = _decode_query_value(val or "")
        if op in ("exists", "notexists"):
            out[field] = {op: True}
        else:
            out[field] = {op: val}
    return out


def coerce_filters(value: Any) -> dict[str, Any] | None:
    """Normalize agent filter input to backend filter DSL or None."""
    if _is_empty(value):
        return None

    parsed = _parse_json_maybe(value)

    # Double-wrap: {"filters": {...}} or {"filters": "[...]"}.
    if isinstance(parsed, dict) and len(parsed) == 1:
        only_key = next(iter(parsed))
        if str(only_key).lower() in ("filters", "filter", "where", "query"):
            return coerce_filters(parsed[only_key])

    if isinstance(parsed, str):
        # Query-string style.
        if "where[" in parsed or parsed.strip().startswith("?"):
            qs_filters = _parse_where_query_string(parsed)
            if qs_filters:
                return qs_filters
        # Retry as JSON after strip.
        inner = _parse_json_maybe(parsed)
        if inner is not parsed:
            return coerce_filters(inner)
        raise ValueError(
            "filters string is not valid JSON or where[...][...] query syntax"
        )

    if isinstance(parsed, list):
        out: dict[str, Any] = {}
        for item in parsed:
            if isinstance(item, dict):
                entry = _clause_to_filter_entry(item)
                if entry:
                    k, spec = entry
                    _merge_filter_dict(out, {k: spec})
                else:
                    _merge_filter_dict(out, _dict_to_filters(item))
            elif isinstance(item, str) and "where[" in item:
                _merge_filter_dict(out, _parse_where_query_string(item))
        return out or None

    if isinstance(parsed, dict):
        return _dict_to_filters(parsed) or None

    raise ValueError(
        f"filters must be object, array of clauses, or JSON/query string; got {type(parsed).__name__}"
    )


def filter_input_as_dict(value: Any) -> dict[str, Any] | None:
    """Best-effort dict layer from raw filter input (before clause normalization)."""
    if _is_empty(value):
        return None
    parsed = _parse_json_maybe(value)
    if isinstance(parsed, dict):
        if len(parsed) == 1:
            only = next(iter(parsed))
            if str(only).lower() in ("filters", "filter", "where", "query"):
                inner = parsed[only]
                if isinstance(inner, dict):
                    return inner
        return parsed
    return None


def coerce_sort(
    *,
    sort: Any = None,
    sort_key: Any = None,
    sort_dir: Any = None,
    order_by: Any = None,
    direction: Any = None,
    embedded_in_filters: dict[str, Any] | None = None,
) -> dict[str, str] | None:
    """Return {key, dir} with dir in asc|desc, or None for backend default."""
    key: str | None = None
    dir_raw: str | None = None

    def _take_key(v: Any) -> None:
        nonlocal key
        if v is not None and str(v).strip():
            key = str(v).strip()

    def _take_dir(v: Any) -> None:
        nonlocal dir_raw
        if v is not None and str(v).strip():
            dir_raw = str(v).strip()

    _take_key(order_by)
    _take_key(sort_key)
    _take_dir(direction)
    _take_dir(sort_dir)

    if sort is not None:
        s = _parse_json_maybe(sort)
        if isinstance(s, dict):
            _take_key(s.get("key") or s.get("field") or s.get("order_by") or s.get("orderby"))
            _take_dir(s.get("dir") or s.get("direction") or s.get("order"))
        elif isinstance(s, str):
            if ":" in s:
                parts = s.split(":", 1)
                _take_key(parts[0])
                _take_dir(parts[1])
            else:
                _take_key(s)

    if embedded_in_filters:
        for sk in ("sort", "order"):
            nested = embedded_in_filters.get(sk)
            if isinstance(nested, dict):
                _take_key(nested.get("key") or nested.get("field"))
                _take_dir(nested.get("dir") or nested.get("direction"))
        _take_key(embedded_in_filters.get("order_by") or embedded_in_filters.get("orderby"))
        _take_dir(embedded_in_filters.get("direction") or embedded_in_filters.get("sort_dir"))

    if not key:
        return None

    d = (dir_raw or "asc").strip().lower()
    if d in ("desc", "descending", "down", "-1", "reverse"):
        dir_norm = "desc"
    else:
        dir_norm = "asc"

    return {"key": key, "dir": dir_norm}


def coerce_int(
    value: Any,
    *,
    default: int,
    minimum: int | None = None,
    maximum: int | None = None,
    field_name: str = "value",
) -> int:
    if value is None or (isinstance(value, str) and not value.strip()):
        n = default
    elif isinstance(value, bool):
        n = int(value)
    elif isinstance(value, int):
        n = value
    elif isinstance(value, float):
        n = int(value)
    elif isinstance(value, str):
        try:
            n = int(value.strip())
        except ValueError:
            try:
                n = int(float(value.strip()))
            except ValueError as e:
                raise ValueError(f"{field_name} must be an integer") from e
    else:
        raise ValueError(f"{field_name} must be an integer; got {type(value).__name__}")

    if minimum is not None and n < minimum:
        n = minimum
    if maximum is not None and n > maximum:
        n = maximum
    return n
