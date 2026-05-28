from __future__ import annotations

from typing import Any

from autosites_mcp.config import settings

_client = None


def get_supabase():
    global _client
    if _client is not None:
        return _client
    if not settings.cms_configured:
        raise RuntimeError(
            "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        )
    from supabase import create_client

    _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client


def list_sites() -> list[dict[str, Any]]:
    sb = get_supabase()
    res = sb.table("sites").select("id, slug, name, created_at").order("slug").execute()
    return res.data or []


def get_site_by_slug_or_id(slug_or_id: str) -> dict[str, Any] | None:
    sb = get_supabase()
    by_slug = (
        sb.table("sites")
        .select("id, slug, name, created_at")
        .eq("slug", slug_or_id)
        .maybe_single()
        .execute()
    )
    if by_slug.data:
        return by_slug.data
    by_id = (
        sb.table("sites")
        .select("id, slug, name, created_at")
        .eq("id", slug_or_id)
        .maybe_single()
        .execute()
    )
    return by_id.data


def get_site_full(slug_or_id: str) -> dict[str, Any]:
    site = get_site_by_slug_or_id(slug_or_id)
    if not site:
        raise LookupError(f"Site not found: {slug_or_id}")
    sb = get_supabase()
    site_id = site["id"]

    admins_res = (
        sb.table("cms_admins")
        .select("user_id, created_at")
        .eq("site_id", site_id)
        .order("created_at", desc=True)
        .execute()
    )
    content_res = (
        sb.table("cms_content")
        .select("key, kind, value, updated_at, updated_by")
        .eq("site_id", site_id)
        .order("key")
        .execute()
    )
    return {
        "site": site,
        "admins": admins_res.data or [],
        "cms_content": content_res.data or [],
    }


def upsert_cms_content(
    *,
    site_slug: str,
    key: str,
    kind: str,
    value: dict[str, Any],
) -> dict[str, Any]:
    site = get_site_by_slug_or_id(site_slug)
    if not site:
        raise LookupError(f"Site not found: {site_slug}")
    if not key or len(key) > 200:
        raise ValueError("key must be 1-200 characters")
    allowed_kinds = {"text", "image", "link", "list", "richText"}
    if kind not in allowed_kinds:
        raise ValueError(f"kind must be one of {sorted(allowed_kinds)}")

    sb = get_supabase()
    row = {
        "site_id": site["id"],
        "key": key,
        "kind": kind,
        "value": value,
    }
    res = sb.table("cms_content").upsert(row).select("key, kind, value, updated_at").execute()
    items = res.data or []
    return items[0] if items else row


def delete_cms_content(*, site_slug: str, key: str, confirm: bool) -> None:
    if not confirm:
        raise ValueError("Set confirm=true to delete CMS content")
    site = get_site_by_slug_or_id(site_slug)
    if not site:
        raise LookupError(f"Site not found: {site_slug}")
    sb = get_supabase()
    sb.table("cms_content").delete().eq("site_id", site["id"]).eq("key", key).execute()


def upload_cms_image(
    *,
    site_slug: str,
    filename: str,
    content_base64: str,
    content_type: str = "image/png",
) -> dict[str, Any]:
    import base64
    import uuid

    site = get_site_by_slug_or_id(site_slug)
    if not site:
        raise LookupError(f"Site not found: {site_slug}")

    raw = base64.b64decode(content_base64, validate=True)
    if len(raw) > 10 * 1024 * 1024:
        raise ValueError("File too large (max 10 MB)")

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    if not ext.isalnum() or len(ext) > 8:
        ext = "bin"
    path = f"{site['id']}/{uuid.uuid4()}.{ext}"

    sb = get_supabase()
    sb.storage.from_("cms-images").upload(path, raw, {"content-type": content_type})
    public = sb.storage.from_("cms-images").get_public_url(path)
    return {"src": public, "path": path}
