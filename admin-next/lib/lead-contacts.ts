import type { SlimLead } from "@/lib/types"

function asNonEmptyString(v: unknown): string | null {
  if (typeof v !== "string") return null
  const s = v.trim()
  return s || null
}

function dataField(lead: SlimLead, key: string): unknown {
  const data = lead.data
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined
  return (data as Record<string, unknown>)[key]
}

function firstString(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    const s = asNonEmptyString(c)
    if (s) return s
  }
  return null
}

/** Primary listing phone (first match across dynamic + Google `data.*`). */
export function getListingPhone(lead: SlimLead): string | null {
  return getListingPhones(lead)[0] ?? null
}

/** All distinct listing phones (national + international when both exist). */
export function getListingPhones(lead: SlimLead): string[] {
  const dyn = lead.dynamic ?? {}
  const candidates = [
    dyn.phone,
    dyn.formatted_phone_number,
    dyn.international_phone_number,
    dyn.phone_number,
    dyn.nationalPhoneNumber,
    dyn.internationalPhoneNumber,
    dataField(lead, "nationalPhoneNumber"),
    dataField(lead, "internationalPhoneNumber"),
  ]
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of candidates) {
    const s = asNonEmptyString(c)
    if (!s) continue
    const key = s.replace(/\s/g, "")
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
  }
  return out
}

export function getListingAddress(lead: SlimLead): string | null {
  const dyn = lead.dynamic ?? {}
  return firstString(
    dyn.formatted_address,
    dyn.address,
    dyn.vicinity,
    dyn.formattedAddress,
    dataField(lead, "formattedAddress"),
    dataField(lead, "adrFormatAddress"),
  )
}

export function getMapsUrl(lead: SlimLead): string {
  const explicit = firstString(
    lead.dynamic?.google_maps_url,
    lead.dynamic?.googleMapsUri,
    dataField(lead, "googleMapsUri"),
  )
  if (explicit) return explicit
  const addr = getListingAddress(lead)
  const q = addr ?? lead.name
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}
