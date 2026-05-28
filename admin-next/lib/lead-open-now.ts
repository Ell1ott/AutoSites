/**
 * Mirrors the legacy Svelte lead overview: prefer regular hours, then current.
 * Unknown/missing → null (does not match "open" or "closed" quick filters).
 */
export function openNowFromLead(lead: Record<string, unknown>): boolean | null {
  const data = lead.data
  if (!data || typeof data !== "object") return null
  const d = data as Record<string, unknown>
  const regular = d.regularOpeningHours
  const current = d.currentOpeningHours
  const from = (blob: unknown): unknown => {
    if (!blob || typeof blob !== "object") return undefined
    return (blob as { openNow?: unknown }).openNow
  }
  const v = from(regular) ?? from(current)
  if (v === true) return true
  if (v === false) return false
  return null
}
