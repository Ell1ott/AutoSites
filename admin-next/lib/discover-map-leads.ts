import type { JobEvent, SlimLead } from "@/lib/types"

export type DiscoverMapLead = {
  placeId: string
  name?: string
  lat: number
  lng: number
  isNew?: boolean
}

export type DiscoverResultRef = {
  placeId: string
  name?: string
  isNew?: boolean
  lat?: number
  lng?: number
}

export function formatRadiusMeters(m: number): string {
  if (!Number.isFinite(m)) return "—"
  if (m >= 1000) {
    const km = m / 1000
    const digits = km >= 10 || m % 1000 === 0 ? 0 : 1
    return `${km.toFixed(digits)} km`
  }
  return `${Math.round(m)} m`
}

function toCoord(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim()) {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function extractLocationFromData(
  data: unknown,
): { lat: number; lng: number } | null {
  if (!data || typeof data !== "object") return null
  const loc = (data as Record<string, unknown>).location
  if (!loc || typeof loc !== "object") return null
  const lat = toCoord((loc as Record<string, unknown>).latitude)
  const lng = toCoord((loc as Record<string, unknown>).longitude)
  if (lat == null || lng == null) return null
  return { lat, lng }
}

export function collectFetchLeadRefsFromEvents(
  events: JobEvent[],
): DiscoverResultRef[] {
  const names = new Map<string, string>()
  for (const e of events) {
    if (e.event !== "item_start") continue
    const d = e.data as { place_id?: string; name?: string }
    if (d.place_id && d.name) names.set(d.place_id, d.name)
  }

  const byId = new Map<string, DiscoverResultRef>()
  for (const e of events) {
    if (e.event !== "item_done") continue
    const d = e.data as {
      place_id?: string
      outputs?: Record<string, unknown>
    }
    const placeId = d.place_id
    if (!placeId) continue

    const outputs = d.outputs ?? {}
    const lat = toCoord(outputs.lat)
    const lng = toCoord(outputs.lng)
    byId.set(placeId, {
      placeId,
      name:
        typeof outputs.name === "string"
          ? outputs.name
          : names.get(placeId),
      isNew: outputs.new === true,
      lat: lat ?? undefined,
      lng: lng ?? undefined,
    })
  }

  return Array.from(byId.values())
}

export function buildDiscoverMapLeads(
  refs: DiscoverResultRef[],
  apiLeads: SlimLead[] = [],
): DiscoverMapLead[] {
  const apiById = new Map(apiLeads.map((l) => [l.place_id, l]))
  const out: DiscoverMapLead[] = []

  for (const ref of refs) {
    let lat = ref.lat
    let lng = ref.lng
    if (lat == null || lng == null) {
      const apiLead = apiById.get(ref.placeId)
      const loc = extractLocationFromData(apiLead?.data)
      if (loc) {
        lat = loc.lat
        lng = loc.lng
      }
    }
    if (lat == null || lng == null) continue

    out.push({
      placeId: ref.placeId,
      name: ref.name ?? apiById.get(ref.placeId)?.name,
      lat,
      lng,
      isNew: ref.isNew,
    })
  }

  return out
}

/** @deprecated use buildDiscoverMapLeads */
export function collectFetchLeadsFromEvents(events: JobEvent[]): DiscoverMapLead[] {
  return buildDiscoverMapLeads(collectFetchLeadRefsFromEvents(events))
}
