import { extractLocationFromData } from "@/lib/discover-map-leads"
import type { SlimLead } from "@/lib/types"

export type LeadsMapPoint = {
  placeId: string
  name: string
  lat: number
  lng: number
  lead: SlimLead
}

export type LeadsMapPointsResult = {
  points: LeadsMapPoint[]
  missingCount: number
}

export function buildLeadsMapPoints(leads: SlimLead[]): LeadsMapPointsResult {
  const points: LeadsMapPoint[] = []
  let missingCount = 0

  for (const lead of leads) {
    const loc = extractLocationFromData(lead.data)
    if (!loc) {
      missingCount += 1
      continue
    }
    points.push({
      placeId: lead.place_id,
      name: lead.name,
      lat: loc.lat,
      lng: loc.lng,
      lead,
    })
  }

  return { points, missingCount }
}
