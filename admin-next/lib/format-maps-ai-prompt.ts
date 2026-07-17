import {
  getListingAddress,
  getListingPhones,
  getMapsUrl,
} from "@/lib/lead-contacts"
import type { SlimLead } from "@/lib/types"

/**
 * Build a paste-ready brief from Google Maps / Places listing data so an AI
 * can quickly draft or adapt a website for a store that may not have one.
 */

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null
  return v as Record<string, unknown>
}

function asNonEmptyString(v: unknown): string | null {
  if (typeof v !== "string") return null
  const s = v.trim()
  return s || null
}

function localizedText(v: unknown): string | null {
  const rec = asRecord(v)
  if (!rec) return asNonEmptyString(v)
  return asNonEmptyString(rec.text)
}

function placeData(lead: SlimLead): Record<string, unknown> {
  return asRecord(lead.data) ?? {}
}

function getDisplayName(lead: SlimLead): string {
  const fromData = localizedText(placeData(lead).displayName)
  return fromData ?? lead.name?.trim() ?? "Unknown business"
}

function getCategory(lead: SlimLead): string | null {
  const data = placeData(lead)
  const display = localizedText(data.primaryTypeDisplayName)
  if (display) return display
  const primary = asNonEmptyString(data.primaryType)
  if (primary) return primary.replace(/_/g, " ")
  const types = data.types
  if (Array.isArray(types) && types.length > 0) {
    const first = asNonEmptyString(types[0])
    if (first) return first.replace(/_/g, " ")
  }
  return null
}

function getTypes(lead: SlimLead): string[] {
  const types = placeData(lead).types
  if (!Array.isArray(types)) return []
  const out: string[] = []
  for (const t of types) {
    const s = asNonEmptyString(t)
    if (!s) continue
    out.push(s.replace(/_/g, " "))
  }
  return out
}

function weekdayDescriptions(hours: unknown): string[] {
  const rec = asRecord(hours)
  if (!rec) return []
  const desc = rec.weekdayDescriptions
  if (!Array.isArray(desc)) return []
  return desc
    .map((d) => asNonEmptyString(d))
    .filter((d): d is string => Boolean(d))
}

function getOpeningHours(lead: SlimLead): string[] {
  const data = placeData(lead)
  const regular = weekdayDescriptions(data.regularOpeningHours)
  if (regular.length > 0) return regular
  return weekdayDescriptions(data.currentOpeningHours)
}

function getCoordinates(lead: SlimLead): { lat: number; lng: number } | null {
  const loc = asRecord(placeData(lead).location)
  if (!loc) return null
  const lat = loc.latitude
  const lng = loc.longitude
  if (typeof lat !== "number" || typeof lng !== "number") return null
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

type ReviewSnippet = {
  rating: number | null
  text: string
  relativeTime: string | null
}

function getReviews(lead: SlimLead, limit = 8): ReviewSnippet[] {
  const reviews = placeData(lead).reviews
  if (!Array.isArray(reviews)) return []
  const out: ReviewSnippet[] = []
  for (const raw of reviews) {
    if (out.length >= limit) break
    const rec = asRecord(raw)
    if (!rec) continue
    const text =
      localizedText(rec.text) ??
      asNonEmptyString(rec.originalText) ??
      localizedText(rec.originalText)
    if (!text) continue
    const rating = typeof rec.rating === "number" ? rec.rating : null
    const relativeTime = asNonEmptyString(rec.relativePublishTimeDescription)
    out.push({ rating, text, relativeTime })
  }
  return out
}

function getSummaryBlob(lead: SlimLead, key: string): string | null {
  const blob = asRecord(placeData(lead)[key])
  if (!blob) return null
  return (
    localizedText(blob.overview) ??
    localizedText(blob.text) ??
    localizedText(blob.disclosureText) ??
    null
  )
}

function formatPriceLevel(v: unknown): string | null {
  const s = asNonEmptyString(v)
  if (!s) return null
  return s.replace(/^PRICE_LEVEL_/, "").replace(/_/g, " ").toLowerCase()
}

function section(title: string, lines: string[]): string[] {
  if (lines.length === 0) return []
  return [`## ${title}`, ...lines, ""]
}

/**
 * Markdown brief optimized for pasting into an AI to create or adapt a
 * website from Google Maps listing data alone.
 */
export function formatMapsDataForAi(lead: SlimLead): string {
  const name = getDisplayName(lead)
  const category = getCategory(lead)
  const address = getListingAddress(lead)
  const phones = getListingPhones(lead)
  const mapsUrl = getMapsUrl(lead)
  const hours = getOpeningHours(lead)
  const coords = getCoordinates(lead)
  const types = getTypes(lead)
  const reviews = getReviews(lead)
  const data = placeData(lead)
  const hasWebsite = Boolean(lead.website?.trim())

  const lines: string[] = [
    `# Google Maps listing brief: ${name}`,
    "",
    "Use this listing data to create or adapt a website for this local business.",
    hasWebsite
      ? `They already have a website (${lead.website}) — treat this as ground-truth business info to improve or rebuild from.`
      : "They do not appear to have a website — invent a clear, conversion-focused site from this listing alone.",
    "Prefer concrete facts from this brief over inventing contact details, hours, or location.",
    "You may invent brand voice, section structure, and imagery direction when not specified.",
    "",
  ]

  const identity: string[] = [`- Name: ${name}`]
  if (category) identity.push(`- Category: ${category}`)
  if (types.length > 0) identity.push(`- Types: ${types.join(", ")}`)
  if (lead.business_status) {
    identity.push(`- Business status: ${lead.business_status}`)
  }
  const price = formatPriceLevel(data.priceLevel)
  if (price) identity.push(`- Price level: ${price}`)
  lines.push(...section("Identity", identity))

  const contact: string[] = []
  if (address) contact.push(`- Address: ${address}`)
  for (const phone of phones) contact.push(`- Phone: ${phone}`)
  if (lead.website) contact.push(`- Website: ${lead.website}`)
  contact.push(`- Google Maps: ${mapsUrl}`)
  if (coords) {
    contact.push(`- Coordinates: ${coords.lat}, ${coords.lng}`)
  }
  lines.push(...section("Contact & location", contact))

  if (hours.length > 0) {
    lines.push(...section("Opening hours", hours.map((h) => `- ${h}`)))
  }

  const reputation: string[] = []
  if (lead.rating != null) reputation.push(`- Rating: ${lead.rating}/5`)
  if (lead.review_count != null) {
    reputation.push(`- Review count: ${lead.review_count}`)
  }
  const reviewSummary = getSummaryBlob(lead, "reviewSummary")
  const generativeSummary = getSummaryBlob(lead, "generativeSummary")
  const editorialSummary = getSummaryBlob(lead, "editorialSummary")
  if (reviewSummary) reputation.push(`- Review summary: ${reviewSummary}`)
  if (generativeSummary) {
    reputation.push(`- Generative summary: ${generativeSummary}`)
  }
  if (editorialSummary) {
    reputation.push(`- Editorial summary: ${editorialSummary}`)
  }
  lines.push(...section("Reputation", reputation))

  if (reviews.length > 0) {
    const reviewLines = reviews.map((r, i) => {
      const bits = [`Review ${i + 1}`]
      if (r.rating != null) bits.push(`${r.rating}/5`)
      if (r.relativeTime) bits.push(r.relativeTime)
      return `- ${bits.join(" · ")}: ${r.text}`
    })
    lines.push(
      ...section(
        "Customer reviews (use for tone, offerings, and trust signals)",
        reviewLines,
      ),
    )
  }

  const extras: string[] = []
  const plusCode = asRecord(data.plusCode)
  const compound = plusCode ? asNonEmptyString(plusCode.compoundCode) : null
  if (compound) extras.push(`- Plus code: ${compound}`)
  if (asNonEmptyString(lead.place_id)) {
    extras.push(`- Place ID: ${lead.place_id}`)
  }
  lines.push(...section("Reference", extras))

  lines.push(
    "## Website brief hints",
    "- Lead with the business name and category; make contact + hours easy to find.",
    "- Mirror real offerings and atmosphere implied by reviews and category.",
    "- Include clear CTAs (call, directions, visit, reserve/order if relevant).",
    "- Do not invent a phone, address, or hours that contradict this listing.",
    "",
  )

  return lines.join("\n").trimEnd() + "\n"
}
