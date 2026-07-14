export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { setCmsLogger } = await import("@autosites/cms/logger");
  const { cmsLogger } = await import("@autosites/analytics/cms-logger");
  setCmsLogger(cmsLogger);

  const { setAnalyticsContextResolver } = await import("@autosites/analytics/server");
  const { getSiteId } = await import("@autosites/cms/server/site");
  const { createSessionServerClient } = await import("@autosites/cms/server/supabase");
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
