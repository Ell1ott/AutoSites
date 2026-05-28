from __future__ import annotations

from typing import Any

from autosites_mcp.clients import backend as backend_client
from autosites_mcp.utils.coerce import (
    coerce_filters,
    coerce_int,
    coerce_json_object,
    coerce_sort,
    filter_input_as_dict,
)
from autosites_mcp.utils.response import tool_result


def search_leads(
    filters: Any = None,
    sort: Any = None,
    sort_key: Any = None,
    sort_dir: Any = None,
    order_by: Any = None,
    direction: Any = None,
    limit: Any = 50,
    offset: Any = 0,
) -> str:
    """Search leads with a JSON filter DSL.

    `filters` accepts many shapes: JSON object, JSON string, clause array
    [{\"key\": \"lead_score\", \"op\": \"gte\", \"value\": 7}], query string
    where[lead_score][gte]=7, or wrapped {\"filters\": {...}}.

    Example filters:
    {\"lead_score\": {\"gte\": 7}}
    {\"design_prompt\": {\"exists\": false}}
    {\"website\": {\"exists\": true}, \"lead_score\": {\"notexists\": true}}
    """
    try:
        parsed_filters = coerce_filters(filters)
        sort_spec = coerce_sort(
            sort=sort,
            sort_key=sort_key,
            sort_dir=sort_dir,
            order_by=order_by,
            direction=direction,
            embedded_in_filters=filter_input_as_dict(filters),
        )

        res = backend_client.backend.list_leads(
            filters=parsed_filters,
            sort=sort_spec,
            limit=coerce_int(limit, default=50, minimum=1, maximum=500, field_name="limit"),
            offset=coerce_int(offset, default=0, minimum=0, field_name="offset"),
        )
        items = res.get("items") or []
        total = res.get("total", len(items))
        summary = f"Found {len(items)} leads (total matching: {total})"
        return tool_result(
            ok=True,
            summary=summary,
            data={
                "items": items,
                "total": total,
                "limit": res.get("limit", limit),
                "offset": res.get("offset", offset),
                "applied_filters": parsed_filters,
                "applied_sort": sort_spec,
            },
            next_actions=[
                "describe_lead(place_id=...) for full detail",
                "rate_lead or patch_lead to update",
                "find_gaps(field='...') to find missing enrichments",
            ],
        )
    except Exception as e:
        return tool_result(ok=False, error=str(e), summary="Lead search failed")


def patch_lead(place_id: str, patch: Any = None, set: Any = None) -> str:
    """Merge fields into a lead. `patch` / `set`: JSON object, string, or list of entries."""
    try:
        body = coerce_json_object(patch if patch is not None else set, field_name="patch")
        if not body:
            raise ValueError("patch must be a non-empty JSON object")
        lead = backend_client.backend.patch_lead(place_id, body)
        return tool_result(
            ok=True,
            summary=f"Patched lead {place_id}",
            data={"lead": lead},
            next_actions=[f"describe_lead(place_id={place_id!r})"],
        )
    except Exception as e:
        return tool_result(ok=False, error=str(e), summary=f"Patch failed for {place_id}")


def rate_lead(place_id: str, score: Any = None) -> str:
    """Set lead_score 1-10, or omit / null score to clear."""
    try:
        parsed_score: int | None
        if score is None or (isinstance(score, str) and score.strip().lower() in ("", "null", "none", "clear")):
            parsed_score = None
        else:
            parsed_score = coerce_int(score, default=0, minimum=1, maximum=10, field_name="score")
        result = backend_client.backend.rate_lead(place_id, parsed_score)
        return tool_result(
            ok=True,
            summary=f"Rated {place_id} → {result.get('lead_score')}",
            data=result,
        )
    except Exception as e:
        return tool_result(ok=False, error=str(e), summary=f"Rating failed for {place_id}")
