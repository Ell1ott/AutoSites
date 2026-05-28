import { readField } from "./filter"
import type { FieldDescriptor, FilterClause, SlimLead } from "./types"

export type ScoreBucket = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export type LeadStatsSnapshot = {
  total: number
  withWebsite: number
  scraped: number
  multiPageCrawl: number
  visualScore: number
  designBrief: number
  websiteOverview: number
  userRated: number
  inspiration: number
  leadScoreBuckets: Record<ScoreBucket, number>
  visualRatingBuckets: Record<ScoreBucket, number>
  avgRating: number | null
  avgLeadScore: number | null
}

export type FieldCoverageRow = {
  key: string
  label: string
  type: string
  count: number
  percent: number
}

export type PipelineStep = {
  id: string
  label: string
  count: number
  percent: number
}

const VISUAL_RATING_CANDIDATES = ["visuel_rating", "visual_rating"] as const

function emptyBuckets(): Record<ScoreBucket, number> {
  return {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0,
    9: 0,
    10: 0,
  }
}

/** Mirrors backend `exists` semantics used by filter.ts. */
export function fieldPopulated(lead: SlimLead, key: string): boolean {
  const v = readField(lead as unknown as Record<string, unknown>, key)
  if (v === undefined || v === null) return false
  if (typeof v === "string") return v.trim().length > 0
  if (Array.isArray(v)) return v.length > 0
  return true
}

export function crawlPageCount(lead: SlimLead): number {
  const dyn = lead.dynamic?.crawl_pages
  if (Array.isArray(dyn)) return dyn.length

  const data = lead.data
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const wc = (data as Record<string, unknown>).website_crawl
    if (wc && typeof wc === "object" && !Array.isArray(wc)) {
      const pages = (wc as Record<string, unknown>).pages
      if (Array.isArray(pages)) return pages.length
    }
  }
  return 0
}

export function hasScreenshot(lead: SlimLead): boolean {
  if (fieldPopulated(lead, "dynamic.screenshot_path")) return true

  const dyn = lead.dynamic?.crawl_pages
  if (Array.isArray(dyn)) {
    for (const page of dyn) {
      if (
        page &&
        typeof page === "object" &&
        typeof (page as { screenshot_path?: unknown }).screenshot_path ===
          "string" &&
        String((page as { screenshot_path: string }).screenshot_path).trim()
      ) {
        return true
      }
    }
  }

  const data = lead.data
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const wc = (data as Record<string, unknown>).website_crawl
    if (wc && typeof wc === "object" && !Array.isArray(wc)) {
      const pages = (wc as Record<string, unknown>).pages
      if (Array.isArray(pages)) {
        for (const page of pages) {
          if (
            page &&
            typeof page === "object" &&
            typeof (page as { screenshot_path?: unknown }).screenshot_path ===
              "string" &&
            String((page as { screenshot_path: string }).screenshot_path).trim()
          ) {
            return true
          }
        }
      }
    }
  }
  return false
}

export function isScraped(lead: SlimLead): boolean {
  return crawlPageCount(lead) >= 1 || hasScreenshot(lead)
}

export function hasWebsite(lead: SlimLead): boolean {
  return fieldPopulated(lead, "website")
}

export function resolveVisualRatingKey(
  fields: FieldDescriptor[],
): string | null {
  const dynamicKeys = new Set(
    fields.filter((f) => f.source === "dynamic").map((f) => f.key),
  )
  for (const key of VISUAL_RATING_CANDIDATES) {
    if (dynamicKeys.has(key)) return key
  }
  for (const key of VISUAL_RATING_CANDIDATES) {
    return key
  }
  return null
}

function dynamicKeyClause(key: string): string {
  return key.includes(".") ? key : `dynamic.${key}`
}

export function visualRatingPopulated(
  lead: SlimLead,
  visualKey: string | null,
): boolean {
  if (!visualKey) return false
  return fieldPopulated(lead, dynamicKeyClause(visualKey))
}

function parseScoreBucket(v: unknown): ScoreBucket | null {
  if (v === null || v === undefined) return null
  const n =
    typeof v === "number"
      ? v
      : typeof v === "string" && v.trim() !== ""
        ? Number(v.trim())
        : NaN
  if (!Number.isFinite(n)) return null
  const rounded = Math.round(n)
  if (rounded < 1 || rounded > 10) return null
  return rounded as ScoreBucket
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export function computeLeadStats(
  rows: SlimLead[],
  fields: FieldDescriptor[],
): LeadStatsSnapshot {
  const total = rows.length
  const visualKey = resolveVisualRatingKey(fields)
  const leadScoreBuckets = emptyBuckets()
  const visualRatingBuckets = emptyBuckets()
  const ratings: number[] = []
  const leadScores: number[] = []

  let withWebsite = 0
  let scraped = 0
  let multiPageCrawl = 0
  let visualScore = 0
  let designBrief = 0
  let websiteOverview = 0
  let userRated = 0
  let inspiration = 0

  for (const lead of rows) {
    if (hasWebsite(lead)) withWebsite += 1

    const crawlCount = crawlPageCount(lead)
    if (isScraped(lead)) scraped += 1
    if (crawlCount >= 2) multiPageCrawl += 1

    if (visualRatingPopulated(lead, visualKey)) visualScore += 1
    if (fieldPopulated(lead, "dynamic.design_prompt")) designBrief += 1
    if (fieldPopulated(lead, "dynamic.website_overview")) websiteOverview += 1
    if (fieldPopulated(lead, "dynamic.design_inspirations")) inspiration += 1

    if (lead.lead_score != null && !Number.isNaN(lead.lead_score)) {
      userRated += 1
      leadScores.push(lead.lead_score)
      const bucket = parseScoreBucket(lead.lead_score)
      if (bucket) leadScoreBuckets[bucket] += 1
    }

    if (lead.rating != null && !Number.isNaN(lead.rating)) {
      ratings.push(lead.rating)
    }

    if (visualKey) {
      const raw = readField(
        lead as unknown as Record<string, unknown>,
        dynamicKeyClause(visualKey),
      )
      const bucket = parseScoreBucket(raw)
      if (bucket) visualRatingBuckets[bucket] += 1
    }
  }

  return {
    total,
    withWebsite,
    scraped,
    multiPageCrawl,
    visualScore,
    designBrief,
    websiteOverview,
    userRated,
    inspiration,
    leadScoreBuckets,
    visualRatingBuckets,
    avgRating: avg(ratings),
    avgLeadScore: avg(leadScores),
  }
}

export function computeFieldCoverage(
  rows: SlimLead[],
  fields: FieldDescriptor[],
): FieldCoverageRow[] {
  const dynamicFields = fields.filter((f) => f.source === "dynamic")
  const total = rows.length
  if (total === 0) {
    return dynamicFields.map((f) => ({
      key: f.key,
      label: f.display?.trim() || f.key,
      type: f.type,
      count: 0,
      percent: 0,
    }))
  }

  return dynamicFields
    .map((f) => {
      const key = dynamicKeyClause(f.key)
      let count = 0
      for (const lead of rows) {
        if (fieldPopulated(lead, key)) count += 1
      }
      return {
        key: f.key,
        label: f.display?.trim() || f.key,
        type: f.type,
        count,
        percent: count / total,
      }
    })
    .sort((a, b) => b.count - a.count)
}

export function buildPipelineSteps(stats: LeadStatsSnapshot): PipelineStep[] {
  const total = stats.total || 1
  const pct = (n: number) => (stats.total === 0 ? 0 : n / total)

  return [
    { id: "total", label: "Fetched", count: stats.total, percent: pct(stats.total) },
    {
      id: "website",
      label: "Has site",
      count: stats.withWebsite,
      percent: pct(stats.withWebsite),
    },
    {
      id: "scraped",
      label: "Scraped",
      count: stats.scraped,
      percent: pct(stats.scraped),
    },
    {
      id: "visual",
      label: "Visual score",
      count: stats.visualScore,
      percent: pct(stats.visualScore),
    },
    {
      id: "brief",
      label: "Design brief",
      count: stats.designBrief,
      percent: pct(stats.designBrief),
    },
    {
      id: "rated",
      label: "Rated",
      count: stats.userRated,
      percent: pct(stats.userRated),
    },
  ]
}

/** Filter clauses for drill-down links from overview stat cards. */
export function fieldExistsHref(fieldKey: string): string {
  const key = dynamicKeyClause(fieldKey)
  const params = new URLSearchParams()
  params.append(`where[${key}][exists]`, "1")
  return `/leads?${params.toString()}`
}

export function statFilterHref(
  statId: string,
  visualKey: string | null,
): string | null {
  const clauses: FilterClause[] = []
  switch (statId) {
    case "website":
      clauses.push({ key: "website", op: "exists" })
      break
    case "scraped":
      clauses.push({ key: "dynamic.crawl_pages", op: "gte", value: 1 })
      break
    case "visual":
      if (!visualKey) return null
      clauses.push({ key: dynamicKeyClause(visualKey), op: "exists" })
      break
    case "brief":
      clauses.push({ key: "dynamic.design_prompt", op: "exists" })
      break
    case "overview":
      clauses.push({ key: "dynamic.website_overview", op: "exists" })
      break
    case "rated":
      clauses.push({ key: "lead_score", op: "exists" })
      break
    case "inspiration":
      clauses.push({ key: "dynamic.design_inspirations", op: "exists" })
      break
    default:
      return null
  }
  const params = new URLSearchParams()
  for (const clause of clauses) {
    const name = `where[${clause.key}][${clause.op}]`
    if (clause.op === "exists" || clause.op === "notexists") {
      params.append(name, "1")
    } else {
      params.append(name, String(clause.value ?? ""))
    }
  }
  return `/leads?${params.toString()}`
}
