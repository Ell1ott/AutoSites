import { extractLocationFromData } from "@/lib/discover-map-leads"
import type { FilterClause } from "@/lib/types"

/** Client-side only — not sent to the backend filter API. */
export const LOCATION_WITHIN_KEY = "__location_within"

export type LocationWithinValue = {
  lat: number
  lng: number
  radius_m: number
}

/** Næstved — 55°13'30.0"N 11°45'30.0"E */
export const DEFAULT_LOCATION_FILTER: LocationWithinValue = {
  lat: 55.225,
  lng: 11.7583333333,
  radius_m: 25_000,
}

export function isLocationFilterClause(c: FilterClause): boolean {
  return c.key === LOCATION_WITHIN_KEY && c.op === "eq"
}

export function parseLocationFilterValue(
  value: unknown,
): LocationWithinValue | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const o = value as Record<string, unknown>
    const lat = toCoord(o.lat)
    const lng = toCoord(o.lng)
    const radius_m = toCoord(o.radius_m)
    if (lat == null || lng == null || radius_m == null || radius_m <= 0) {
      return null
    }
    return { lat, lng, radius_m }
  }

  if (typeof value !== "string" || !value.trim()) return null
  const parts = value.split(",").map((s) => s.trim())
  if (parts.length !== 3) return null
  const lat = toCoord(parts[0])
  const lng = toCoord(parts[1])
  const radius_m = toCoord(parts[2])
  if (lat == null || lng == null || radius_m == null || radius_m <= 0) {
    return null
  }
  return { lat, lng, radius_m }
}

export function encodeLocationFilterValue(v: LocationWithinValue): string {
  return `${v.lat},${v.lng},${v.radius_m}`
}

export function locationFilterClause(
  value: LocationWithinValue,
): FilterClause {
  return {
    key: LOCATION_WITHIN_KEY,
    op: "eq",
    value: encodeLocationFilterValue(value),
  }
}

export function extractLocationFilter(
  clauses: FilterClause[],
): LocationWithinValue | null {
  const clause = clauses.find(isLocationFilterClause)
  if (!clause) return null
  return parseLocationFilterValue(clause.value)
}

export function setLocationFilter(
  clauses: FilterClause[],
  value: LocationWithinValue | null,
): FilterClause[] {
  const rest = clauses.filter((c) => !isLocationFilterClause(c))
  if (!value) return rest
  return [...rest, locationFilterClause(value)]
}

function toCoord(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim()) {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function leadWithinLocationFilter(
  lead: Record<string, unknown>,
  filter: LocationWithinValue,
): boolean {
  const loc = extractLocationFromData(lead.data)
  if (!loc) return false
  const dist = haversineDistanceMeters(
    filter.lat,
    filter.lng,
    loc.lat,
    loc.lng,
  )
  return dist <= filter.radius_m
}
