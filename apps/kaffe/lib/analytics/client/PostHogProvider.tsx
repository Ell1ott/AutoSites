"use client";

import { useEffect, useRef, type ReactNode } from "react";
import posthog from "posthog-js";
import type { AnalyticsContext } from "@/lib/analytics/events";
import { PageView } from "./PageView";

type Props = {
  ctx: AnalyticsContext;
  publicKey: string | null;
  apiHost: string;
  uiHost: string;
  children: ReactNode;
};

export function PostHogProvider({ ctx, publicKey, apiHost, uiHost, children }: Props) {
  const initialized = useRef(false);
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    if (initialized.current || !publicKey || typeof window === "undefined") return;
    initialized.current = true;
    posthog.init(publicKey, {
      api_host: apiHost,
      ui_host: uiHost,
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: true,
      enable_heatmaps: true,
      capture_performance: { web_vitals: true, network_timing: true },
      person_profiles: "identified_only",
      disable_session_recording: true,
      loaded: (ph) => {
        ph.register({
          site_id: ctx.siteId,
          user_id: ctx.userId,
          user_email: ctx.email,
          is_logged_in: ctx.isLoggedIn,
          edit_mode: ctx.editMode,
          host: window.location.host,
        });
        if (ctx.siteId) ph.group("site", ctx.siteId);
        if (ctx.userId) {
          ph.identify(ctx.userId, ctx.email ? { email: ctx.email } : undefined);
          lastUserId.current = ctx.userId;
        }
      },
    });
  }, [publicKey, apiHost, uiHost, ctx.editMode, ctx.email, ctx.isLoggedIn, ctx.siteId, ctx.userId]);

  useEffect(() => {
    if (!initialized.current) return;
    posthog.register({
      site_id: ctx.siteId,
      user_id: ctx.userId,
      user_email: ctx.email,
      is_logged_in: ctx.isLoggedIn,
      edit_mode: ctx.editMode,
    });
    if (ctx.siteId) posthog.group("site", ctx.siteId);
    if (ctx.userId && ctx.userId !== lastUserId.current) {
      posthog.identify(ctx.userId, ctx.email ? { email: ctx.email } : undefined);
      lastUserId.current = ctx.userId;
    } else if (!ctx.userId && lastUserId.current) {
      posthog.reset();
      lastUserId.current = null;
    }
  }, [ctx.editMode, ctx.email, ctx.isLoggedIn, ctx.siteId, ctx.userId]);

  return (
    <>
      {publicKey ? <PageView /> : null}
      {children}
    </>
  );
}
