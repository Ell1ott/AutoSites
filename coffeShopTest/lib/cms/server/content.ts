import { cacheTag } from "next/cache";
import { createPublicServerClient } from "./supabase";
import type { CmsKind, CmsRow, CmsValueByKind } from "../types";

export async function getCmsContent<K extends CmsKind>(
  siteId: string,
  key: string,
): Promise<CmsRow<K> | null> {
  "use cache";
  cacheTag(`cms:${siteId}:${key}`);

  const supabase = createPublicServerClient();
  const { data, error } = await supabase
    .from("cms_content")
    .select("kind, value")
    .eq("site_id", siteId)
    .eq("key", key)
    .maybeSingle();

  if (error || !data) return null;

  return {
    kind: data.kind as K,
    value: data.value as CmsValueByKind[K],
  };
}
