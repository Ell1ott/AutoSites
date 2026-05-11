// Compact relative-time formatter for job rows. "just now", "2m ago", "1h ago".
// Falls back to a localized date for >24h.

export function formatRelativeTime(iso?: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const t = d.getTime()
  if (Number.isNaN(t)) return ""

  const deltaSec = Math.round((Date.now() - t) / 1000)
  if (deltaSec < 5) return "just now"
  if (deltaSec < 60) return `${deltaSec}s ago`
  const m = Math.round(deltaSec / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.round(h / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

/** Returns "Nm Ss" or "Ss" from a seconds count. */
export function formatEtaSeconds(seconds?: number): string {
  if (typeof seconds !== "number" || seconds < 0 || !Number.isFinite(seconds)) {
    return ""
  }
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}
