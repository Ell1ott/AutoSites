from __future__ import annotations

from typing import Any

from autosites_mcp.clients import backend as backend_client
from autosites_mcp.clients import supabase_client
from autosites_mcp.utils.response import tool_result


def autosites_overview() -> str:
    """Health, field catalog summary, AI tasks, sites, and recent jobs."""
    try:
        health = backend_client.backend.healthz()
        fields = backend_client.backend.fields()
        tasks = backend_client.backend.list_ai_tasks()
        jobs = backend_client.backend.list_jobs(limit=10)

        sites: list[dict[str, Any]] = []
        from autosites_mcp.config import settings

        if settings.cms_configured:
            try:
                sites = supabase_client.list_sites()
                cms_note = f"{len(sites)} site(s)"
            except Exception as e:
                cms_note = f"CMS error: {e}"
        else:
            cms_note = "Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for CMS tools"

        dynamic_fields = fields.get("dynamic") or []
        summary = (
            f"Backend OK. {len(dynamic_fields)} dynamic fields, "
            f"{len(tasks)} AI tasks, {len(jobs)} recent jobs, {cms_note}."
        )
        return tool_result(
            ok=True,
            summary=summary,
            data={
                "health": health,
                "field_counts": {
                    "columns": len(fields.get("columns") or []),
                    "dynamic": len(dynamic_fields),
                    "data_fields": len(fields.get("data_fields") or []),
                },
                "top_dynamic_fields": [
                    {"key": f.get("key"), "type": f.get("type"), "coverage": f.get("coverage")}
                    for f in dynamic_fields[:15]
                ],
                "ai_tasks": [
                    {"name": t.get("name"), "label": t.get("label"), "enabled": t.get("enabled")}
                    for t in tasks
                ],
                "recent_jobs": [
                    {
                        "id": j.get("id"),
                        "kind": j.get("kind"),
                        "status": j.get("status"),
                        "created_at": j.get("created_at"),
                    }
                    for j in jobs
                ],
                "sites": sites,
            },
            next_actions=[
                "Call search_leads with filters to find leads",
                "Call describe_lead with a place_id for full detail",
                "Call run_job or run_job_and_wait to enqueue work",
            ],
        )
    except Exception as e:
        return tool_result(ok=False, error=str(e), summary="Failed to load overview")


def describe_lead(place_id: str) -> str:
    """Full lead detail including ai_history and populated dynamic fields."""
    try:
        lead = backend_client.backend.get_lead(place_id)
        dynamic = lead.get("dynamic") or {}
        populated = sorted(k for k, v in dynamic.items() if v is not None and v != "")
        summary = f"Lead {lead.get('name')} ({place_id}): score={lead.get('lead_score')}, {len(populated)} dynamic fields"
        return tool_result(
            ok=True,
            summary=summary,
            data={
                "lead": lead,
                "populated_dynamic_fields": populated,
            },
            next_actions=[
                f"rate_lead(place_id={place_id!r}, score=1-10)",
                f"patch_lead(place_id={place_id!r}, patch={{...}})",
                "enrich_leads(place_ids=[...], task='...')",
            ],
        )
    except Exception as e:
        return tool_result(ok=False, error=str(e), summary=f"Lead {place_id} not found")


def describe_ai_task(name: str) -> str:
    """AI task configuration (model, schema, task_type)."""
    try:
        task = backend_client.backend.get_ai_task(name)
        return tool_result(
            ok=True,
            summary=f"Task {name} ({task.get('task_type')}) — {task.get('label')}",
            data=task,
            next_actions=[
                f"enrich_leads(task={name!r}, place_ids=[...])",
                "manage_ai_task(action='update', name=..., patch={...})",
            ],
        )
    except Exception as e:
        return tool_result(ok=False, error=str(e), summary=f"Task {name} not found")
