import { cache } from "react";
import { createPublicServerClient } from "./supabase";

export const getSiteId = cache(async (): Promise<string> => {
  const slug = process.env.SITE_SLUG;
  if (!slug) throw new Error("SITE_SLUG env var is not set.");

  const supabase = createPublicServerClient();
  const { data, error } = await supabase
    .from("sites")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Unknown site slug: ${slug}. Insert it into the sites table.`);
  }
  return data.id as string;
});
