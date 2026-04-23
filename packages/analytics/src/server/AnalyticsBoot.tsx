import type { ReactNode } from "react";
import { getAnalyticsContext } from "./analytics-context";
import { PostHogProvider } from "../client/PostHogProvider";

export async function AnalyticsBoot({ children }: { children: ReactNode }) {
  const ctx = await getAnalyticsContext();
  const publicKey = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? null;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "/load-content";
  const uiHost = "https://eu.posthog.com";

  return (
    <PostHogProvider ctx={ctx} publicKey={publicKey} apiHost={apiHost} uiHost={uiHost}>
      {children}
    </PostHogProvider>
  );
}
