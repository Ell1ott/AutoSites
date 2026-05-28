from __future__ import annotations

from mcp.server.fastmcp import FastMCP

from autosites_mcp.config import settings
from autosites_mcp.prompts import workflows as prompt_workflows
from autosites_mcp.resources import content as resource_content
from autosites_mcp.tools import cms, discovery, jobs, leads, workflows

mcp = FastMCP("autosites", json_response=True)


# --- Discovery ---
mcp.tool()(discovery.autosites_overview)
mcp.tool()(discovery.describe_lead)
mcp.tool()(discovery.describe_ai_task)

# --- Leads ---
mcp.tool()(leads.search_leads)
mcp.tool()(leads.patch_lead)
mcp.tool()(leads.rate_lead)

# --- Jobs ---
mcp.tool()(jobs.run_job)
mcp.tool()(jobs.run_job_and_wait)
mcp.tool()(jobs.debug_job)
mcp.tool()(jobs.cancel_job)

# --- Workflows / AI tasks ---
mcp.tool()(workflows.manage_ai_task)
mcp.tool()(workflows.discover_leads)
mcp.tool()(workflows.enrich_leads)
mcp.tool()(workflows.crawl_leads)
mcp.tool()(workflows.find_gaps)

# --- CMS (always registered; returns clear error if Supabase env is missing) ---
mcp.tool()(cms.list_sites)
mcp.tool()(cms.get_site)
mcp.tool()(cms.upsert_cms_content)
mcp.tool()(cms.delete_cms_content)
mcp.tool()(cms.upload_cms_image)


# --- Resources ---
@mcp.resource("autosites://lead/{place_id}")
def lead_resource(place_id: str) -> str:
    """Full lead JSON including ai_history."""
    return resource_content.read_lead_resource(place_id)


@mcp.resource("autosites://job/{job_id}/export")
def job_export_resource(job_id: str) -> str:
    """Markdown debug export for a job."""
    return resource_content.read_job_export_resource(job_id)


@mcp.resource("autosites://job/{job_id}/export/{event}")
def job_export_event_resource(job_id: str, event: str) -> str:
    """Markdown debug export focused on one event."""
    return resource_content.read_job_export_resource(job_id, event)


@mcp.resource("autosites://schema/fields")
def schema_fields_resource() -> str:
    """Dynamic field catalog from GET /fields."""
    return resource_content.read_schema_fields_resource()


@mcp.resource("autosites://site/{slug}/cms")
def site_cms_resource(slug: str) -> str:
    """Site metadata and all CMS content."""
    if not settings.cms_configured:
        return '{"error": "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"}'
    return resource_content.read_site_cms_resource(slug)


# --- Prompts ---
@mcp.prompt()
def triage_leads() -> str:
    """Find unrated leads with websites, summarize, suggest scores."""
    return prompt_workflows.triage_leads_prompt()


@mcp.prompt()
def debug_failed_job(job_id: str) -> str:
    """Debug a failed job using its export bundle."""
    return prompt_workflows.debug_failed_job_prompt(job_id)


@mcp.prompt()
def enrich_lead_pipeline(place_id: str, task: str = "design_prompt") -> str:
    """crawl → ai_task → verify for one lead."""
    return prompt_workflows.enrich_lead_pipeline_prompt(place_id, task)


@mcp.prompt()
def audit_site_cms(site_slug: str) -> str:
    """Compare CMS keys vs expected site structure."""
    return prompt_workflows.audit_site_cms_prompt(site_slug)


@mcp.prompt()
def discover_leads_map(
    query: str = "businesses",
    lat: float = 55.6761,
    lng: float = 12.5683,
    radius_m: int = 25_000,
) -> str:
    """Run a map-biased Google Places discover job (center + radius)."""
    return prompt_workflows.discover_leads_prompt(query, lat, lng, radius_m)
