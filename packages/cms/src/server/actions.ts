"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "./auth";
import { createSessionServerClient } from "./supabase";
import type { CmsKind, CmsValueByKind } from "../types";
import { getCmsLogger } from "../logger";

export async function updateContent<K extends CmsKind>(
  key: string,
  kind: K,
  value: CmsValueByKind[K],
  options?: { revalidate?: boolean },
): Promise<void> {
  const { userId, siteId } = await requireAdmin();

  if (!key || typeof key !== "string" || key.length > 200) {
    throw new Error("Invalid cmsKey.");
  }
  validateValue(kind, value);

  const supabase = await createSessionServerClient();
  const { error } = await supabase.from("cms_content").upsert({
    site_id: siteId,
    key,
    kind,
    value,
    updated_by: userId,
  });
  if (error) throw new Error(error.message);

  if (options?.revalidate !== false) {
    updateTag(`cms:${siteId}:${key}`);
  }

  await getCmsLogger().captureServerEvent(
    "cms_content_updated",
    { key, kind, value_length: estimateValueLength(value), deferred_revalidate: options?.revalidate === false },
    { userId, siteId },
  );
}

/**
 * Invalidate the cache for a single CMS key without writing anything.
 * Used to defer revalidation after a series of low-frequency writes
 * (e.g. style slider saves) so the page only refreshes once.
 */
export async function revalidateContent(key: string): Promise<void> {
  const { userId, siteId } = await requireAdmin();
  if (!key || typeof key !== "string" || key.length > 200) {
    throw new Error("Invalid cmsKey.");
  }
  updateTag(`cms:${siteId}:${key}`);
  await getCmsLogger().captureServerEvent("cms_content_revalidated", { key }, { userId, siteId });
}

export async function uploadImage(
  formData: FormData,
): Promise<{ src: string; width?: number; height?: number }> {
  const { userId, siteId } = await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file provided.");
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("File too large (max 10 MB).");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image.");
  }

  const supabase = await createSessionServerClient();
  const ext = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : "bin";
  const safeExt = /^[a-z0-9]{1,8}$/.test(ext) ? ext : "bin";
  const path = `${siteId}/${crypto.randomUUID()}.${safeExt}`;

  const { error } = await supabase.storage
    .from("cms-images")
    .upload(path, file, { contentType: file.type });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("cms-images").getPublicUrl(path);

  await getCmsLogger().captureServerEvent(
    "cms_image_uploaded",
    {
      filename: file.name,
      content_type: file.type,
      size_bytes: file.size,
      storage_path: path,
    },
    { userId, siteId },
  );

  return { src: data.publicUrl };
}

function estimateValueLength(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "string") return value.length;
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (typeof v.text === "string") return v.text.length;
    if (typeof v.label === "string") return v.label.length;
    if (typeof v.alt === "string") return v.alt.length;
    try { return JSON.stringify(value).length; } catch { return 0; }
  }
  return 0;
}

function validateValue(kind: CmsKind, value: unknown): void {
  if (!value || typeof value !== "object") {
    throw new Error("Value must be an object.");
  }
  const v = value as Record<string, unknown>;
  if (kind === "text") {
    if (typeof v.text !== "string" || v.text.length > 5000) {
      throw new Error("text.text must be a string (≤ 5000 chars).");
    }
    if (v.style !== undefined) {
      if (!v.style || typeof v.style !== "object") {
        throw new Error("text.style must be an object.");
      }
      const s = v.style as Record<string, unknown>;
      if (s.fontSize !== undefined) {
        if (typeof s.fontSize !== "number" || !Number.isFinite(s.fontSize)) {
          throw new Error("text.style.fontSize must be a number.");
        }
        if (s.fontSize < 0.5 || s.fontSize > 6) {
          throw new Error("text.style.fontSize out of range (0.5–6).");
        }
      }
      if (s.lineHeight !== undefined) {
        if (typeof s.lineHeight !== "number" || !Number.isFinite(s.lineHeight)) {
          throw new Error("text.style.lineHeight must be a number.");
        }
        if (s.lineHeight < 0.8 || s.lineHeight > 3) {
          throw new Error("text.style.lineHeight out of range (0.8–3).");
        }
      }
    }
  } else if (kind === "image") {
    if (typeof v.src !== "string" || typeof v.alt !== "string") {
      throw new Error("image must have string 'src' and 'alt'.");
    }
    if (v.src.length > 2000 || v.alt.length > 1000) {
      throw new Error("image src/alt too long.");
    }
  } else if (kind === "link") {
    if (typeof v.href !== "string" || typeof v.label !== "string") {
      throw new Error("link must have string 'href' and 'label'.");
    }
    if (v.href.length > 2000 || v.label.length > 500) {
      throw new Error("link href/label too long.");
    }
  } else if (kind === "list") {
    const ids = (v as { ids?: unknown }).ids;
    if (!Array.isArray(ids) || ids.length > 200) {
      throw new Error("list.ids must be an array (≤ 200 items).");
    }
    for (const id of ids) {
      if (typeof id !== "string" || id.length === 0 || id.length > 64) {
        throw new Error("list.ids entries must be non-empty strings (≤ 64 chars).");
      }
    }
  } else {
    throw new Error(`Unknown kind: ${kind}`);
  }
}

// ---------- list actions ----------
//
// Lists store only the ordered ids in their own row (kind "list"). Each item's
// content lives in regular text/image/link rows keyed `${listKey}.${id}.${field}`.
//
// `fallbackIds` is needed because on the very first mutation no DB row exists
// yet — the React tree is rendering from the caller's `fallback` prop. The
// client passes those ids so the server can persist the full ordered list.

const LIST_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

function validateListKey(listKey: string): void {
  if (!listKey || typeof listKey !== "string" || listKey.length > 200) {
    throw new Error("Invalid listKey.");
  }
}

function validateItemId(id: string): void {
  if (!LIST_ID_RE.test(id)) {
    throw new Error("Invalid item id.");
  }
}

function validateFallbackIds(ids: string[]): void {
  if (!Array.isArray(ids) || ids.length > 200) {
    throw new Error("Invalid fallbackIds.");
  }
  for (const id of ids) validateItemId(id);
}

async function readListIds(
  supabase: Awaited<ReturnType<typeof createSessionServerClient>>,
  siteId: string,
  listKey: string,
  fallbackIds: string[],
): Promise<string[]> {
  const { data, error } = await supabase
    .from("cms_content")
    .select("kind, value")
    .eq("site_id", siteId)
    .eq("key", listKey)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return [...fallbackIds];
  if (data.kind !== "list") {
    throw new Error(`Key ${listKey} exists but is not a list.`);
  }
  const ids = (data.value as { ids?: unknown })?.ids;
  if (!Array.isArray(ids)) return [...fallbackIds];
  return ids.filter((s): s is string => typeof s === "string");
}

async function writeListIds(
  supabase: Awaited<ReturnType<typeof createSessionServerClient>>,
  siteId: string,
  userId: string,
  listKey: string,
  ids: string[],
): Promise<void> {
  validateValue("list", { ids });
  const { error } = await supabase.from("cms_content").upsert({
    site_id: siteId,
    key: listKey,
    kind: "list",
    value: { ids },
    updated_by: userId,
  });
  if (error) throw new Error(error.message);
}

export async function appendListItem(
  listKey: string,
  fallbackIds: string[],
): Promise<{ id: string }> {
  const { userId, siteId } = await requireAdmin();
  validateListKey(listKey);
  validateFallbackIds(fallbackIds);

  const supabase = await createSessionServerClient();
  const current = await readListIds(supabase, siteId, listKey, fallbackIds);
  const newId = crypto.randomUUID().slice(0, 8);
  const next = [...current, newId];
  await writeListIds(supabase, siteId, userId, listKey, next);

  updateTag(`cms:${siteId}:${listKey}`);
  await getCmsLogger().captureServerEvent(
    "cms_list_item_added",
    { listKey, id: newId, length: next.length },
    { userId, siteId },
  );
  return { id: newId };
}

export async function removeListItem(
  listKey: string,
  id: string,
  fallbackIds: string[],
): Promise<void> {
  const { userId, siteId } = await requireAdmin();
  validateListKey(listKey);
  validateItemId(id);
  validateFallbackIds(fallbackIds);

  const supabase = await createSessionServerClient();
  const current = await readListIds(supabase, siteId, listKey, fallbackIds);
  const next = current.filter((existing) => existing !== id);
  await writeListIds(supabase, siteId, userId, listKey, next);

  // Find and delete child rows. We escape `_` and `%` defensively even though
  // the id regex doesn't permit them — cheap insurance if the regex changes.
  const childPrefix = `${listKey}.${id}.`;
  const escaped = childPrefix.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const { data: children, error: selErr } = await supabase
    .from("cms_content")
    .select("key")
    .eq("site_id", siteId)
    .like("key", `${escaped}%`);
  if (selErr) throw new Error(selErr.message);

  const childKeys = (children ?? []).map((r) => r.key as string);
  if (childKeys.length > 0) {
    const { error: delErr } = await supabase
      .from("cms_content")
      .delete()
      .eq("site_id", siteId)
      .in("key", childKeys);
    if (delErr) throw new Error(delErr.message);
  }

  updateTag(`cms:${siteId}:${listKey}`);
  for (const k of childKeys) updateTag(`cms:${siteId}:${k}`);

  await getCmsLogger().captureServerEvent(
    "cms_list_item_removed",
    { listKey, id, orphans_deleted: childKeys.length, length: next.length },
    { userId, siteId },
  );
}

export async function moveListItem(
  listKey: string,
  id: string,
  direction: "up" | "down",
  fallbackIds: string[],
): Promise<void> {
  const { userId, siteId } = await requireAdmin();
  validateListKey(listKey);
  validateItemId(id);
  validateFallbackIds(fallbackIds);
  if (direction !== "up" && direction !== "down") {
    throw new Error("direction must be 'up' or 'down'.");
  }

  const supabase = await createSessionServerClient();
  const current = await readListIds(supabase, siteId, listKey, fallbackIds);
  const idx = current.indexOf(id);
  if (idx === -1) throw new Error("Item not found in list.");
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= current.length) return; // no-op at boundary

  const next = [...current];
  [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
  await writeListIds(supabase, siteId, userId, listKey, next);

  updateTag(`cms:${siteId}:${listKey}`);
  await getCmsLogger().captureServerEvent(
    "cms_list_item_moved",
    { listKey, id, direction, position: swapWith },
    { userId, siteId },
  );
}
