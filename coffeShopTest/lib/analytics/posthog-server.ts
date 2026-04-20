import "server-only";
import { PostHog } from "posthog-node";
import { after } from "next/server";
import { getAnalyticsContext } from "./server/analytics-context";
import type { EventName } from "./events";

let client: PostHog | null = null;

function getClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.POSTHOG_HOST ?? "https://eu.i.posthog.com";
  if (!key) return null;
  if (!client) {
    client = new PostHog(key, { host, flushAt: 1, flushInterval: 0 });
  }
  return client;
}

export async function captureServerEvent(
  event: EventName,
  properties: Record<string, unknown> = {},
  overrides?: { distinctId?: string; userId?: string | null; email?: string | null; siteId?: string },
): Promise<void> {
  const ph = getClient();
  if (!ph) return;

  let ctx;
  try {
    ctx = await getAnalyticsContext();
  } catch {
    ctx = { userId: null, email: null, siteId: "unknown", isLoggedIn: false, editMode: false };
  }

  const userId = overrides?.userId ?? ctx.userId;
  const email = overrides?.email ?? ctx.email;
  const siteId = overrides?.siteId ?? ctx.siteId;
  const distinctId = overrides?.distinctId ?? userId ?? `anon:${siteId}`;

  after(async () => {
    ph.capture({
      distinctId,
      event,
      properties: {
        site_id: siteId,
        user_id: userId,
        user_email: email,
        is_logged_in: Boolean(userId),
        edit_mode: ctx.editMode,
        $groups: { site: siteId },
        ...properties,
      },
    });
    await ph.flush().catch(() => {});
  });
}
