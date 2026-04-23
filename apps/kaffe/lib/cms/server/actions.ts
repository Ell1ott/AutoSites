"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "./auth";
import { createSessionServerClient } from "./supabase";
import type { CmsKind, CmsValueByKind } from "../types";
import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { EVENTS } from "@/lib/analytics/events";

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

  await captureServerEvent(
    EVENTS.CMS_CONTENT_UPDATED,
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
  await captureServerEvent(EVENTS.CMS_CONTENT_REVALIDATED, { key }, { userId, siteId });
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

  await captureServerEvent(
    EVENTS.CMS_IMAGE_UPLOADED,
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
  } else {
    throw new Error(`Unknown kind: ${kind}`);
  }
}
