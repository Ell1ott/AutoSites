// Small UI helpers for lead-shaped data. Backend screenshot routes aren't
// finalized yet; this helper centralizes the URL guess so we can swap it
// from one place when they are.

import { getPiBackendBase } from "./pi-url"
import type { Lead, SlimLead } from "./types"

/**
 * Resolve a screenshot URL for a lead.
 *
 * Two strategies, in order:
 *   1. `dynamic.screenshot_path` — explicit path written by a crawler/job.
 *   2. Convention route `/leads/:place_id/screenshot` — the backend may or
 *      may not serve this yet. `<img onError>` should always handle 404.
 *
 * Returns null when the API base is unknown (e.g. production without env).
 */
export function getScreenshotUrl(lead: SlimLead | Lead): string | null {
  const cleanBase = getPiBackendBase()
  if (!cleanBase) return null
  const dynPath = lead.dynamic?.screenshot_path
  if (typeof dynPath === "string" && dynPath.trim()) {
    return `${cleanBase}/screenshots/${encodeURIComponent(dynPath)}`
  }
  return `${cleanBase}/leads/${encodeURIComponent(lead.place_id)}/screenshot`
}

/**
 * Look up the most likely short text-y AI summary on a lead. Tries a small
 * set of common dynamic keys; falls back to the first reasonably-short
 * string value if none of them match.
 */
const SUMMARY_KEYS = [
  "design_prompt",
  "summary",
  "ai_summary",
  "description",
  "about",
]

export function getLeadSummary(lead: SlimLead | Lead): string | null {
  const dyn = lead.dynamic ?? {}
  for (const k of SUMMARY_KEYS) {
    const v = dyn[k]
    if (typeof v === "string" && v.trim().length > 0) return v
  }
  // Fallback: first short-ish string field in dynamic.
  for (const v of Object.values(dyn)) {
    if (typeof v === "string" && v.length > 16 && v.length < 600) return v
  }
  return null
}
