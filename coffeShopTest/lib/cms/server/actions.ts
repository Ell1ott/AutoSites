"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "./auth";
import { createSessionServerClient } from "./supabase";
import type { CmsKind, CmsValueByKind } from "../types";

export async function updateContent<K extends CmsKind>(
  key: string,
  kind: K,
  value: CmsValueByKind[K],
): Promise<void> {
  const { userId } = await requireAdmin();

  if (!key || typeof key !== "string" || key.length > 200) {
    throw new Error("Invalid cmsKey.");
  }
  validateValue(kind, value);

  const supabase = await createSessionServerClient();
  const { error } = await supabase.from("cms_content").upsert({
    key,
    kind,
    value,
    updated_by: userId,
  });
  if (error) throw new Error(error.message);

  updateTag(`cms:${key}`);
}

export async function uploadImage(
  formData: FormData,
): Promise<{ src: string; width?: number; height?: number }> {
  await requireAdmin();

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
  const path = `${crypto.randomUUID()}.${safeExt}`;

  const { error } = await supabase.storage
    .from("cms-images")
    .upload(path, file, { contentType: file.type });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("cms-images").getPublicUrl(path);
  return { src: data.publicUrl };
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
