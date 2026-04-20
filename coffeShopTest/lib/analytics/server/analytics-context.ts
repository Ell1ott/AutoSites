import { cookies } from "next/headers";
import { createSessionServerClient } from "@/lib/cms/server/supabase";
import { getSiteId } from "@/lib/cms/server/site";
import type { AnalyticsContext } from "@/lib/analytics/events";

export async function getAnalyticsContext(): Promise<AnalyticsContext> {
  const [cookieStore, siteId, supabase] = await Promise.all([
    cookies(),
    getSiteId(),
    createSessionServerClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    siteId,
    isLoggedIn: Boolean(user),
    editMode: cookieStore.get("cms-edit")?.value === "1",
  };
}
