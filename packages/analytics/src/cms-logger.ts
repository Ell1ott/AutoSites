import { EVENTS, type EventName } from "./events";
import { captureServerEvent } from "./server/posthog-server";

export type CmsLogger = {
  captureServerEvent(
    event: string,
    props?: Record<string, unknown>,
    ctx?: { userId?: string | null; email?: string | null; siteId?: string },
  ): Promise<void> | void;
};

const knownEvents: ReadonlySet<string> = new Set(Object.values(EVENTS));

function asEventName(event: string): EventName {
  if (!knownEvents.has(event)) {
    throw new Error(`Unknown analytics event: ${event}`);
  }
  return event as EventName;
}

export const cmsLogger: CmsLogger = {
  async captureServerEvent(event, props, ctx) {
    await captureServerEvent(asEventName(event), props, ctx);
  },
};
