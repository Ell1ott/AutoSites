"use client";

import { useCallback } from "react";
import posthog from "posthog-js";
import type { EventName } from "../events";

export function useTrack() {
  return useCallback((event: EventName | (string & {}), properties?: Record<string, unknown>) => {
    if (typeof window === "undefined") return;
    posthog.capture(event, properties);
  }, []);
}
