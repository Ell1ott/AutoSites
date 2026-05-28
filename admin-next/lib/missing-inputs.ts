// Client-side mirror of `backend/ai/runtime.missing_inputs_for_place`. Used by
// the task editor to warn (and gate the test-run) when selected leads don't
// satisfy the task's hard dependencies.

import type { AiTaskConfig, SlimLead } from "./types"

const SCREENSHOT_KEYS = new Set(["screenshot"])
const MARKDOWN_KEYS = new Set(["markdown", "crawl_pages"])

/** Resolve the dependency keys the backend will enforce for this task. */
export function requiredInputKeys(config: AiTaskConfig): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const k of config.included_context ?? []) {
    if (k && !seen.has(k)) {
      out.push(k)
      seen.add(k)
    }
  }
  const sendScreenshot = config.send_screenshot !== false
  if (sendScreenshot && !seen.has("screenshot")) {
    out.push("screenshot")
    seen.add("screenshot")
  }
  const sendMarkdown = config.send_markdown !== false
  if (sendMarkdown && ![...MARKDOWN_KEYS].some((k) => seen.has(k))) {
    out.push("markdown")
    seen.add("markdown")
  }
  return out
}

function hasNonEmpty(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === "string") return value.trim().length > 0
  if (typeof value === "number" || typeof value === "boolean") return true
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "object") return Object.keys(value as object).length > 0
  return false
}

/**
 * Return the labels of required inputs the lead doesn't satisfy. Empty array
 * means the lead is ready for this task.
 *
 * The client can't peek at the on-disk screenshot/markdown blobs, so the best
 * available signals are:
 *   - screenshot → `dynamic.screenshot_path` set
 *   - markdown   → the lead has a `website` (nothing to crawl otherwise)
 *   - any other key → present on the lead (top-level or `dynamic[key]`)
 */
export function missingInputsForLead(
  lead: SlimLead,
  config: AiTaskConfig,
): string[] {
  const missing: string[] = []
  const dyn = lead.dynamic ?? {}
  const topLevel = lead as unknown as Record<string, unknown>

  for (const key of requiredInputKeys(config)) {
    if (SCREENSHOT_KEYS.has(key)) {
      // Unknown (older API response with no `has_screenshot`) → assume present
      // rather than scaring the user with a false positive.
      if (lead.has_screenshot === false) missing.push("screenshot")
      continue
    }
    if (MARKDOWN_KEYS.has(key)) {
      if (lead.has_markdown === false) {
        missing.push(key)
      } else if (lead.has_markdown === undefined && !hasNonEmpty(lead.website)) {
        // Pre-flag-API fallback: no website ⇒ nothing to crawl ⇒ no markdown.
        missing.push(key)
      }
      continue
    }
    if (hasNonEmpty(dyn[key])) continue
    if (hasNonEmpty(topLevel[key])) continue
    missing.push(key)
  }
  return missing
}
