"use client";

import { useCallback } from "react";

export type ClientLogger = {
  track(event: string, props?: Record<string, unknown>): void;
};

const NOOP: ClientLogger = { track: () => {} };

// Stored on globalThis so a single app-boot registration is visible to every
// client component rendered inside it.
const KEY = Symbol.for("autosites.cms.clientLogger");
type Store = { [k: symbol]: ClientLogger | undefined };

export function setClientLogger(logger: ClientLogger): void {
  (globalThis as Store)[KEY] = logger;
}

function activeLogger(): ClientLogger {
  return (globalThis as Store)[KEY] ?? NOOP;
}

export function useTrack(): ClientLogger["track"] {
  return useCallback((event, props) => {
    activeLogger().track(event, props);
  }, []);
}
