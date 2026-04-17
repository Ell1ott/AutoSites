import { cache } from "react";
import { headers } from "next/headers";
import { createPublicServerClient } from "./supabase";

export const getSiteId = cache(async (): Promise<string> => {
  const h = await headers();
  const host = h.get("host");
  if (!host) throw new Error("No Host header — cannot resolve site.");

  const supabase = createPublicServerClient();
  const { data, error } = await supabase
    .from("site_hosts")
    .select("site_id")
    .eq("host", host)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Unknown host: ${host}. Register it in site_hosts.`);
  }
  return data.site_id as string;
});
