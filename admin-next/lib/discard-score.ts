import { readField } from "./filter"

/**
 * The lead's numeric discard score, or null if unscored / unparseable. The
 * discard_score task emits a structured `{ score, reason }` object, but we also
 * tolerate a bare number or numeric string for robustness.
 */
export function readDiscardScore(
  lead: Record<string, unknown>,
): number | null {
  let raw: unknown = readField(lead, "discard_score")
  if (raw && typeof raw === "object") {
    raw = (raw as Record<string, unknown>).score
  }
  if (raw === null || raw === undefined) return null
  const n = typeof raw === "number" ? raw : Number(String(raw).trim())
  return Number.isFinite(n) ? n : null
}
