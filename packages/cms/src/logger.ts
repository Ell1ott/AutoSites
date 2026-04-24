export type CmsLogger = {
  captureServerEvent(
    event: string,
    props?: Record<string, unknown>,
    ctx?: { userId?: string | null; email?: string | null; siteId?: string },
  ): Promise<void> | void;
};

export const NOOP_LOGGER: CmsLogger = { captureServerEvent: () => {} };

// Stored on globalThis so the singleton crosses Next's RSC module-graph boundary:
// instrumentation.ts (Node entry) sets it, Server Components read it during render.
const KEY = Symbol.for("autosites.cms.logger");
type Store = { [k: symbol]: CmsLogger | undefined };

export function setCmsLogger(logger: CmsLogger): void {
  (globalThis as Store)[KEY] = logger;
}

export function getCmsLogger(): CmsLogger {
  return (globalThis as Store)[KEY] ?? NOOP_LOGGER;
}
