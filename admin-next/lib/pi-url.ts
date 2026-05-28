/** Local Pi backend URL when NEXT_PUBLIC_PI_URL is unset (`next dev` only). */
export const DEFAULT_DEV_PI_URL = "http://localhost:8888"

/** Trailing slashes stripped; `null` if unknown (unset in production build). */
export function getPiBackendBase(): string | null {
  const raw = process.env.NEXT_PUBLIC_PI_URL?.trim()
  if (raw) return raw.replace(/\/+$/, "")
  if (process.env.NODE_ENV === "development") return DEFAULT_DEV_PI_URL
  return null
}
