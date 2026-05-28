from __future__ import annotations


def triage_leads_prompt() -> str:
    return """You are triaging leads in the AutoSites CRM.

Steps:
1. Call autosites_overview to understand available dynamic fields and AI tasks.
2. Call search_leads with filters like {"website": {"exists": true}, "lead_score": {"notexists": true}}.
3. For promising leads, call describe_lead(place_id=...).
4. Summarize each lead: name, website, rating, missing enrichments.
5. Suggest lead_score 1-10 and next enrichment steps (crawl, ai_task, inspiration).
6. Use rate_lead to persist scores when the user confirms."""


def debug_failed_job_prompt(job_id: str) -> str:
    return f"""Debug a failed AutoSites job.

Job id: {job_id}

Steps:
1. Call debug_job(job_id={job_id!r}) for the paste-ready markdown bundle.
2. Read the error class, traceback, and preceding events.
3. Identify root cause (API key, handler bug, bad args, timeout).
4. Propose a concrete fix in the codebase or job args.
5. If needed, re-run with run_job_and_wait after the fix."""


def enrich_lead_pipeline_prompt(place_id: str, task: str = "design_prompt") -> str:
    return f"""Run an enrichment pipeline for one lead.

Place id: {place_id}
Preferred AI task: {task}

Steps:
1. describe_lead(place_id={place_id!r}) — check website and existing dynamic fields.
2. If no markdown/crawl data, crawl_leads(place_ids='["{place_id}"]').
3. enrich_leads(task={task!r}, place_ids='["{place_id}"]').
4. describe_lead again to verify outputs landed in dynamic.{task}."""


def audit_site_cms_prompt(site_slug: str) -> str:
    return f"""Audit CMS content for site slug: {site_slug}

Steps:
1. get_site(site={site_slug!r}) — list all cms_content keys and kinds.
2. Compare keys against expected page structure (hero, footer, etc.).
3. Report missing keys, stale content, or broken image URLs.
4. Suggest upsert_cms_content calls for gaps (do not write without user confirmation)."""


def discover_leads_prompt(
    query: str = "businesses",
    lat: float = 55.6761,
    lng: float = 12.5683,
    radius_m: int = 25_000,
) -> str:
    return f"""Discover new leads via Google Places (map-biased search).

Search query: {query!r}
Center: {lat}, {lng}
Radius: {radius_m} m

Steps:
1. Call discover_leads(query={query!r}, lat={lat}, lng={lng}, radius_m={radius_m}) or run_job(kind="fetch_leads", args=...) with the same args.
2. Poll or wait for the job to finish; item_done events include lat/lng for each place.
3. Call search_leads to list imported leads, or describe_lead(place_id=...) for detail.
4. Suggest crawl_leads / enrich_leads for promising results."""
