from __future__ import annotations

import json

from autosites_mcp.clients import backend as backend_client
from autosites_mcp.clients import supabase_client
from autosites_mcp.config import settings


def read_lead_resource(place_id: str) -> str:
    lead = backend_client.backend.get_lead(place_id)
    return json.dumps(lead, ensure_ascii=False, default=str, indent=2)


def read_job_export_resource(job_id: str, event: str = "") -> str:
    event_id = int(event) if event else None
    body = backend_client.backend.export_job(job_id, event=event_id, fmt="markdown")
    return str(body)


def read_site_cms_resource(slug: str) -> str:
    full = supabase_client.get_site_full(slug)
    return json.dumps(full, ensure_ascii=False, default=str, indent=2)


def read_schema_fields_resource() -> str:
    fields = backend_client.backend.fields()
    return json.dumps(fields, ensure_ascii=False, default=str, indent=2)


def cms_available() -> bool:
    return settings.cms_configured
