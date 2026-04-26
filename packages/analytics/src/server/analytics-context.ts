import { cookies } from "next/headers";
import type { AnalyticsContext } from "../events";

export type AnalyticsContextResolver = {
  getSiteId(): Promise<string>;
  getCurrentUser(): Promise<{ id: string | null; email: string | null }>;
};

// Stored on globalThis so the singleton crosses Next's RSC module-graph boundary:
// instrumentation.ts (Node entry) sets it, Server Components read it during render.
const KEY = Symbol.for("autosites.analytics.contextResolver");
type Store = { [k: symbol]: AnalyticsContextResolver | undefined };

export function setAnalyticsContextResolver(r: AnalyticsContextResolver): void {
  (globalThis as Store)[KEY] = r;
}

function required(): AnalyticsContextResolver {
  const r = (globalThis as Store)[KEY];
  if (!r) {
    throw new Error(
      "AnalyticsContextResolver not registered — call setAnalyticsContextResolver() at app boot.",
    );
  }
  return r;
}

export async function getAnalyticsContext(): Promise<AnalyticsContext> {
  // Await cookies() first: it emits the dynamic-rendering signal so this
  // subtree is skipped during static prerender (its Suspense fallback is used
  // instead). Only at request time do we look up the resolver, by which point
  // instrumentation.ts has registered it.
  const cookieStore = await cookies();
  const r = required();
  const [siteId, user] = await Promise.all([r.getSiteId(), r.getCurrentUser()]);

  return {
    userId: user.id,
    email: user.email,
    siteId,
    isLoggedIn: Boolean(user.id),
    editMode: cookieStore.get("cms-edit")?.value === "1",
  };
}
