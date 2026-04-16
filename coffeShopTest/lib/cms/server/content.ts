import { cacheTag } from "next/cache";
import { createPublicServerClient } from "./supabase";
import type { CmsKind, CmsRow, CmsValueByKind } from "../types";

/**
 * Cached read of a single CMS row by key. Tagged with `cms:<key>` so a
 * Server Action can call `revalidateTag('cms:<key>')` after a write to
 * publish the new value on the next request.
 *
 * Returns `null` if no row exists — callers use their `fallback` prop.
 */
export async function getCmsContent<K extends CmsKind>(
  key: string,
): Promise<CmsRow<K> | null> {
  "use cache";
  cacheTag(`cms:${key}`);

  const supabase = createPublicServerClient();
  const { data, error } = await supabase
    .from("cms_content")
    .select("kind, value")
    .eq("key", key)
    .maybeSingle();

  if (error || !data) return null;

  return {
    kind: data.kind as K,
    value: data.value as CmsValueByKind[K],
  };
}
