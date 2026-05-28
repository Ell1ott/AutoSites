"""Template variable expansion for AI task prompts.

Tasks reference placeholders like `{{name}}`, `{{visuel_rating}}`, or
`{{website_overview}}` in their `meta_prompt`. We resolve them from a flat
namespace built from the place row:

  - top-level: `name`, `category`, `website`, `rating`, `review_count`, `place_id`
  - everything under `place["dynamic"]` (whatever AI tasks have written so far)

Missing keys collapse to an empty string. They never crash.
"""
from __future__ import annotations

import json
import re
from typing import Any

_PLACEHOLDER = re.compile(r"\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}")


def build_namespace(place: dict[str, Any]) -> dict[str, str]:
    """Flatten a place row into the `{{var}}` namespace."""
    raw = place.get("data") or {}
    display = raw.get("displayName") or {}
    primary_type = raw.get("primaryTypeDisplayName") or {}
    name = (
        place.get("name")
        or (display.get("text") if isinstance(display, dict) else None)
        or ""
    )
    category = (
        primary_type.get("text") if isinstance(primary_type, dict) else None
    ) or (raw.get("primaryType") or "")

    ns: dict[str, str] = {
        "place_id": _str(place.get("place_id")),
        "name": _str(name),
        "category": _str(category),
        "website": _str(place.get("website")),
        "rating": _str(place.get("rating")),
        "review_count": _str(place.get("review_count")),
        "business_status": _str(place.get("business_status")),
        "lead_score": _str(place.get("lead_score")),
    }
    dynamic = place.get("dynamic") or {}
    if isinstance(dynamic, dict):
        for key, value in dynamic.items():
            ns.setdefault(key, _str(value))
            # dynamic always wins if there's a clash with a top-level alias
            ns[key] = _str(value)
    return ns


def expand_template(template: str, place: dict[str, Any]) -> tuple[str, list[str]]:
    """Substitute `{{var}}` placeholders. Returns (rendered, missing_keys)."""
    ns = build_namespace(place)
    missing: list[str] = []

    def _sub(m: re.Match[str]) -> str:
        key = m.group(1)
        if key in ns:
            return ns[key]
        missing.append(key)
        return ""

    rendered = _PLACEHOLDER.sub(_sub, template)
    return rendered, missing


def _str(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float, bool)):
        return str(value)
    # dict / list — pretty-stringify so a prompt referencing {{ai_subpages}} sees
    # something readable rather than a Python repr.
    try:
        return json.dumps(value, ensure_ascii=False)
    except (TypeError, ValueError):
        return str(value)
