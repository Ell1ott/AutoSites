from __future__ import annotations

import json
from typing import Any

from autosites_mcp.clients import supabase_client
from autosites_mcp.utils.response import tool_result


def list_sites() -> str:
    """List all CMS sites."""
    try:
        sites = supabase_client.list_sites()
        return tool_result(
            ok=True,
            summary=f"{len(sites)} site(s)",
            data={"items": sites},
            next_actions=["get_site(site=...) for full CMS content"],
        )
    except Exception as e:
        return tool_result(ok=False, error=str(e), summary="Failed to list sites")


def get_site(site: str) -> str:
    """Get site metadata, admins, and all cms_content by slug or id."""
    try:
        full = supabase_client.get_site_full(site)
        content_count = len(full.get("cms_content") or [])
        site_row = full.get("site") or {}
        return tool_result(
            ok=True,
            summary=f"Site {site_row.get('slug')}: {content_count} CMS entries",
            data=full,
            next_actions=[
                f"upsert_cms_content(site_slug={site_row.get('slug')!r}, key=..., kind=..., value=...)",
            ],
        )
    except Exception as e:
        return tool_result(ok=False, error=str(e), summary=f"Site {site} not found")


def upsert_cms_content(
    site_slug: str,
    key: str,
    kind: str,
    value: str,
) -> str:
    """Upsert CMS content. value is JSON matching kind (text/image/link/list/richText)."""
    try:
        parsed = json.loads(value)
        if not isinstance(parsed, dict):
            raise ValueError("value must be a JSON object")
        row = supabase_client.upsert_cms_content(
            site_slug=site_slug,
            key=key,
            kind=kind,
            value=parsed,
        )
        return tool_result(
            ok=True,
            summary=f"Upserted {site_slug}/{key}",
            data={"content": row},
        )
    except Exception as e:
        return tool_result(ok=False, error=str(e), summary="CMS upsert failed")


def delete_cms_content(site_slug: str, key: str, confirm: bool = False) -> str:
    """Delete a CMS content key. Requires confirm=true."""
    try:
        supabase_client.delete_cms_content(
            site_slug=site_slug, key=key, confirm=confirm
        )
        return tool_result(
            ok=True,
            summary=f"Deleted {site_slug}/{key}",
        )
    except Exception as e:
        return tool_result(ok=False, error=str(e), summary="CMS delete failed")


def upload_cms_image(
    site_slug: str,
    filename: str,
    content_base64: str,
    content_type: str = "image/png",
) -> str:
    """Upload image to cms-images bucket. Returns public URL for EditableImage values."""
    try:
        result = supabase_client.upload_cms_image(
            site_slug=site_slug,
            filename=filename,
            content_base64=content_base64,
            content_type=content_type,
        )
        return tool_result(
            ok=True,
            summary=f"Uploaded {filename} for {site_slug}",
            data=result,
            next_actions=[
                f'upsert_cms_content(site_slug={site_slug!r}, key=..., kind="image", value={{"src": "...", "alt": "..."}})',
            ],
        )
    except Exception as e:
        return tool_result(ok=False, error=str(e), summary="Image upload failed")
