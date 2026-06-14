import type { SlimLead } from "@/lib/types"

export type WebsiteContacts = {
  emails: string[]
  phones: string[]
  socials: Record<string, string[]>
  extracted_at?: string
  pages_scanned?: number
}

const SOCIAL_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  twitter: "Twitter",
  tiktok: "TikTok",
  youtube: "YouTube",
  pinterest: "Pinterest",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  snapchat: "Snapchat",
  threads: "Threads",
  yelp: "Yelp",
  tripadvisor: "TripAdvisor",
}

export function socialLabel(platform: string): string {
  return SOCIAL_LABELS[platform] ?? platform.replaceAll("_", " ")
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

function withAtPrefix(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`
}

/** Best-effort handle or profile slug extracted from a social URL. */
export function socialHandle(platform: string, url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    return null
  }

  const segments = parsed.pathname.split("/").filter(Boolean)
  if (segments.length === 0) return null

  const seg = (index: number) => decodePathSegment(segments[index] ?? "")
  const head = segments[0]?.toLowerCase() ?? ""

  switch (platform) {
    case "instagram":
    case "twitter":
    case "threads":
      return withAtPrefix(seg(0))

    case "tiktok": {
      const handle = seg(0)
      return handle ? withAtPrefix(handle) : null
    }

    case "snapchat": {
      if (head === "add" && segments[1]) return withAtPrefix(seg(1))
      return segments[0] ? withAtPrefix(seg(0)) : null
    }

    case "facebook": {
      if (head === "profile.php") {
        const id = parsed.searchParams.get("id")
        return id ? `#${id}` : null
      }
      if (head === "pages") {
        if (segments.length >= 3) return seg(2)
        if (segments.length >= 2) return seg(1)
        return null
      }
      if (head === "pg" && segments[1]) return seg(1)
      if (head === "people" && segments[1]) return seg(1)
      if (segments.length === 1) return seg(0)
      return segments.slice(0, 2).map(decodePathSegment).join("/")
    }

    case "linkedin": {
      if (["company", "in", "school"].includes(head) && segments[1]) {
        return `${head}/${seg(1)}`
      }
      return segments.map(decodePathSegment).join("/")
    }

    case "youtube": {
      const first = seg(0)
      if (first.startsWith("@")) return first
      if (["channel", "c", "user"].includes(head) && segments[1]) {
        return `${head}/${seg(1)}`
      }
      if (parsed.hostname === "youtu.be" && segments[0]) return seg(0)
      return first || null
    }

    case "pinterest": {
      if (head === "pin" && segments[1]) return seg(1)
      return seg(0) || null
    }

    case "whatsapp": {
      if (parsed.hostname === "wa.me" && segments[0]) return seg(0)
      const phone = parsed.searchParams.get("phone")
      if (phone) return phone.startsWith("+") ? phone : `+${phone}`
      return seg(0) || null
    }

    case "telegram": {
      if (parsed.hostname === "t.me" && segments[0]) {
        const user = seg(0)
        return user.startsWith("+") ? user : withAtPrefix(user)
      }
      return seg(0) ? withAtPrefix(seg(0)) : null
    }

    case "yelp": {
      if (head === "biz" && segments[1]) return seg(1)
      return segments.map(decodePathSegment).join("/")
    }

    case "tripadvisor": {
      if (head === "profile" && segments[1]) return seg(1)
      return seg(segments.length - 1) || null
    }

    default:
      return seg(segments.length - 1) || null
  }
}

export function socialChipLabel(platform: string, url: string): string {
  const handle = socialHandle(platform, url)
  const label = socialLabel(platform)
  return handle ? `${label} · ${handle}` : label
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === "string" && x.trim() !== "")
}

function asSocials(v: unknown): Record<string, string[]> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {}
  const out: Record<string, string[]> = {}
  for (const [k, urls] of Object.entries(v as Record<string, unknown>)) {
    const list = asStringArray(urls)
    if (list.length) out[k] = list
  }
  return out
}

export function parseWebsiteContacts(
  dynamic: Record<string, unknown> | undefined | null,
): WebsiteContacts | null {
  const raw = dynamic?.website_contacts
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const obj = raw as Record<string, unknown>
  return {
    emails: asStringArray(obj.emails),
    phones: asStringArray(obj.phones),
    socials: asSocials(obj.socials),
    extracted_at:
      typeof obj.extracted_at === "string" ? obj.extracted_at : undefined,
    pages_scanned:
      typeof obj.pages_scanned === "number" ? obj.pages_scanned : undefined,
  }
}

export function hasContacts(lead: SlimLead): boolean {
  if (lead.has_contacts === true) return true
  if (lead.has_contacts === false) return false
  const wc = parseWebsiteContacts(lead.dynamic)
  return Boolean(wc?.extracted_at)
}

/** True when crawl artifacts exist (screenshot on disk or extracted contacts). */
export function isLeadCrawled(lead: SlimLead): boolean {
  if (lead.has_screenshot === true) return true
  if (lead.has_screenshot === false) return false
  if (hasContacts(lead)) return true
  const pages = lead.dynamic?.crawl_pages
  return Array.isArray(pages) && pages.length > 0
}

export function contactCounts(wc: WebsiteContacts | null): {
  emails: number
  phones: number
  socials: number
  total: number
} {
  if (!wc) return { emails: 0, phones: 0, socials: 0, total: 0 }
  const socials = Object.values(wc.socials).reduce((n, urls) => n + urls.length, 0)
  return {
    emails: wc.emails.length,
    phones: wc.phones.length,
    socials,
    total: wc.emails.length + wc.phones.length + socials,
  }
}

export function primaryEmail(wc: WebsiteContacts | null): string | null {
  return wc?.emails[0] ?? null
}

export function hasAnyContactHit(wc: WebsiteContacts | null): boolean {
  const c = contactCounts(wc)
  return c.total > 0
}
