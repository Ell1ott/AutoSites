from __future__ import annotations

import json
from typing import Any

from autosites_mcp.clients import backend as backend_client
from autosites_mcp.utils.coerce import coerce_json_array, coerce_json_object
from autosites_mcp.utils.response import tool_result


def manage_ai_task(
    action: str,
    name: str | None = None,
    body: Any = None,
) -> str:
    """Manage AI tasks: action=list|get|create|update."""
    try:
        if action == "list":
            tasks = backend_client.backend.list_ai_tasks()
            return tool_result(
                ok=True,
                summary=f"{len(tasks)} AI task(s)",
                data={"items": tasks},
                next_actions=["describe_ai_task(name=...) for config detail"],
            )
        if not name:
            raise ValueError("name is required for get/create/update")

        if action == "get":
            task = backend_client.backend.get_ai_task(name)
            return tool_result(ok=True, summary=f"Task {name}", data=task)

        if action in ("create", "update"):
            if body is None:
                raise ValueError("body JSON is required for create/update")
            parsed = coerce_json_object(body, field_name="body")
            if not parsed:
                raise ValueError("body must be a non-empty JSON object")
            if action == "create":
                parsed.setdefault("name", name)
                task = backend_client.backend.create_ai_task(parsed)
            else:
                task = backend_client.backend.patch_ai_task(name, parsed)
            return tool_result(
                ok=True,
                summary=f"Task {name} {action}d",
                data=task,
            )

        raise ValueError("action must be list, get, create, or update")
    except Exception as e:
        return tool_result(ok=False, error=str(e), summary="AI task operation failed")


def discover_leads(
    query: str,
    lat: float = 55.4318,
    lng: float = 11.5555,
    radius_m: int = 25_000,
    count: int = 10,
    region_code: str = "DK",
    language_code: str = "da",
    rank_by_distance: bool = True,
    wait: bool = True,
    timeout_seconds: int = 300,
) -> str:
    """Run fetch_leads job via Google Places search (center + radius bias)."""
    try:
        from autosites_mcp.tools.jobs import run_job, run_job_and_wait

        args = json.dumps(
            {
                "query": query,
                "lat": lat,
                "lng": lng,
                "radius_m": radius_m,
                "count": count,
                "region_code": region_code,
                "language_code": language_code,
                "rank_by_distance": rank_by_distance,
            }
        )
        if wait:
            return run_job_and_wait(kind="fetch_leads", args=args, timeout_seconds=timeout_seconds)
        return run_job("fetch_leads", args)
    except Exception as e:
        return tool_result(ok=False, error=str(e), summary="discover_leads failed")


def enrich_leads(
    task: str,
    place_ids: Any,
    wait: bool = True,
    timeout_seconds: int = 1800,
) -> str:
    """Run ai_task or find_inspiration for given place_ids."""
    try:
        from autosites_mcp.tools.jobs import run_job, run_job_and_wait

        ids = coerce_json_array(place_ids, field_name="place_ids")

        task_row = backend_client.backend.get_ai_task(task)
        task_type = task_row.get("task_type", "place")
        kind = {
            "browser_agent": "find_inspiration",
            "variant": "variant_design",
        }.get(task_type, "ai_task")
        args = json.dumps({"task": task, "place_ids": ids})

        if wait:
            return run_job_and_wait(kind=kind, args=args, timeout_seconds=timeout_seconds)
        return run_job(kind, args)
    except Exception as e:
        return tool_result(ok=False, error=str(e), summary="enrich_leads failed")


def crawl_leads(place_ids: str, wait: bool = True, timeout_seconds: int = 900) -> str:
    """Run crawl then html_to_md for leads with websites."""
    try:
        from autosites_mcp.tools.jobs import run_job, run_job_and_wait

        ids = coerce_json_array(place_ids, field_name="place_ids")

        args = json.dumps({"place_ids": ids})
        if not wait:
            return run_job("crawl", args)

        crawl_result = run_job_and_wait(kind="crawl", args=args, timeout_seconds=timeout_seconds)
        crawl_data = json.loads(crawl_result)
        if not crawl_data.get("ok"):
            return crawl_result

        return run_job_and_wait(kind="html_to_md", args=args, timeout_seconds=timeout_seconds)
    except Exception as e:
        return tool_result(ok=False, error=str(e), summary="crawl_leads failed")


def find_gaps(field: str, limit: int = 50) -> str:
    """Find leads missing a dynamic field (not enriched yet)."""
    try:
        from autosites_mcp.tools.leads import search_leads

        return search_leads(
            filters={field: {"notexists": True}},
            limit=limit,
        )
    except Exception as e:
        return tool_result(ok=False, error=str(e), summary="find_gaps failed")
