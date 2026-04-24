"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { setClientLogger } from "@autosites/cms/client-logger";

export function CmsClientLoggerBridge() {
  useEffect(() => {
    setClientLogger({
      track: (event, props) => {
        if (typeof window === "undefined") return;
        posthog.capture(event, props);
      },
    });
  }, []);
  return null;
}
