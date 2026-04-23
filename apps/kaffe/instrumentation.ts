import type { EventName } from "@/lib/analytics/events";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { setCmsLogger } = await import("@/lib/cms/logger");
  const { captureServerEvent } = await import("@/lib/analytics/posthog-server");
  setCmsLogger({
    captureServerEvent: (event, props, ctx) =>
      captureServerEvent(event as EventName, props, ctx),
  });

  const { setAnalyticsContextResolver } = await import(
    "@/lib/analytics/server/analytics-context"
  );
  const { getSiteId } = await import("@/lib/cms/server/site");
  const { createSessionServerClient } = await import("@/lib/cms/server/supabase");
  setAnalyticsContextResolver({
    getSiteId,
    async getCurrentUser() {
      const supabase = await createSessionServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return { id: user?.id ?? null, email: user?.email ?? null };
    },
  });
}
