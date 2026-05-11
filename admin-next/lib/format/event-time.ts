// Format an ISO timestamp as a compact "HH:MM:SS.sss" prefix for log/event rows.
// Tolerant of malformed input — returns an empty string when the date is invalid.

export function formatEventTime(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number, w = 2) => String(n).padStart(w, "0")
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
}
