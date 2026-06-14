import type { FilterClause } from "./types"

/** Crawled subpages list on a lead (`dynamic.crawl_pages`). */
export const CRAWL_PAGES_KEY = "dynamic.crawl_pages"

/** Synthetic clause key — client-side only; not a DB column. */
export const QUICK_OPEN_NOW_KEY = "__quick_open_now"

export type WebsiteQuick = "all" | "with" | "without"
export type CrawlQuick = "all" | "multi" | "none"
export type OpenNowQuick = "all" | "open" | "closed"
export type ContactsQuick = "all" | "has" | "missing"

export const MIN_RATING_OPTIONS = ["3", "3.5", "4", "4.5", "5"] as const
export type MinRatingOption = (typeof MIN_RATING_OPTIONS)[number] | "any"

export const MIN_REVIEW_OPTIONS = ["5", "10", "25", "50", "100", "250", "500"] as const
export type MinReviewOption = (typeof MIN_REVIEW_OPTIONS)[number] | "any"

export type LeadQuickFiltersState = {
  website: WebsiteQuick
  crawl: CrawlQuick
  minRating: MinRatingOption
  minReviewCount: MinReviewOption
  /** Strictly greater than N (same as legacy `> N`). */
  leadScoreGt: "any" | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10"
  openNow: OpenNowQuick
  contacts: ContactsQuick
}

export const DEFAULT_QUICK_FILTERS: LeadQuickFiltersState = {
  website: "all",
  crawl: "all",
  minRating: "any",
  minReviewCount: "any",
  leadScoreGt: "any",
  openNow: "all",
  contacts: "all",
}

function sameClause(a: FilterClause, b: FilterClause): boolean {
  return (
    a.key === b.key &&
    a.op === b.op &&
    JSON.stringify(a.value) === JSON.stringify(b.value)
  )
}

function isQuickWebsiteClause(c: FilterClause): boolean {
  return (
    c.key === "website" && (c.op === "exists" || c.op === "notexists")
  )
}

function isQuickCrawlClause(c: FilterClause): boolean {
  if (c.key !== CRAWL_PAGES_KEY) return false
  if (
    c.op === "gte" &&
    (c.value === 2 || c.value === "2")
  ) {
    return true
  }
  if (c.op === "lt" && (c.value === 2 || c.value === "2")) {
    return true
  }
  return false
}

function isQuickRatingClause(c: FilterClause): boolean {
  if (c.key !== "rating" || c.op !== "gte") return false
  const v = String(c.value ?? "")
  return (MIN_RATING_OPTIONS as readonly string[]).includes(v)
}

function isQuickReviewClause(c: FilterClause): boolean {
  if (c.key !== "review_count" || c.op !== "gte") return false
  const v = String(c.value ?? "")
  return (MIN_REVIEW_OPTIONS as readonly string[]).includes(v)
}

function isQuickScoreClause(c: FilterClause): boolean {
  if (c.key !== "lead_score" || c.op !== "gt") return false
  const v = String(c.value ?? "")
  return /^(10|[0-9])$/.test(v)
}

function isQuickOpenNowClause(c: FilterClause): boolean {
  return c.key === QUICK_OPEN_NOW_KEY && c.op === "eq"
}

function isQuickContactsClause(c: FilterClause): boolean {
  return (
    c.key === "dynamic.website_contacts" &&
    (c.op === "exists" || c.op === "notexists")
  )
}

/**
 * Remove clauses that were produced by the quick-filter bar (best-effort) so we
 * can replace them without duplicating.
 */
export function stripQuickFilterClauses(clauses: FilterClause[]): FilterClause[] {
  return clauses.filter(
    (c) =>
      !isQuickWebsiteClause(c) &&
      !isQuickCrawlClause(c) &&
      !isQuickRatingClause(c) &&
      !isQuickReviewClause(c) &&
      !isQuickScoreClause(c) &&
      !isQuickOpenNowClause(c) &&
      !isQuickContactsClause(c),
  )
}

export function quickFilterClauses(state: LeadQuickFiltersState): FilterClause[] {
  const out: FilterClause[] = []
  if (state.website === "with") out.push({ key: "website", op: "exists" })
  if (state.website === "without") out.push({ key: "website", op: "notexists" })
  if (state.crawl === "multi") {
    out.push({ key: CRAWL_PAGES_KEY, op: "gte", value: 2 })
  }
  if (state.crawl === "none") {
    out.push({ key: CRAWL_PAGES_KEY, op: "lt", value: 2 })
  }
  if (state.minRating !== "any") {
    out.push({ key: "rating", op: "gte", value: state.minRating })
  }
  if (state.minReviewCount !== "any") {
    out.push({
      key: "review_count",
      op: "gte",
      value: state.minReviewCount,
    })
  }
  if (state.leadScoreGt !== "any") {
    out.push({ key: "lead_score", op: "gt", value: state.leadScoreGt })
  }
  if (state.openNow === "open") {
    out.push({ key: QUICK_OPEN_NOW_KEY, op: "eq", value: "open" })
  }
  if (state.openNow === "closed") {
    out.push({ key: QUICK_OPEN_NOW_KEY, op: "eq", value: "closed" })
  }
  if (state.contacts === "has") {
    out.push({ key: "dynamic.website_contacts", op: "exists" })
  }
  if (state.contacts === "missing") {
    out.push({ key: "dynamic.website_contacts", op: "notexists" })
  }
  return out
}

/** Best-effort parse so toggles stay in sync with the clause list / URL. */
export function parseQuickFiltersFromClauses(
  clauses: FilterClause[],
): LeadQuickFiltersState {
  const s: LeadQuickFiltersState = { ...DEFAULT_QUICK_FILTERS }

  for (const c of clauses) {
    if (c.op === "exists" && c.key === "website") s.website = "with"
    if (c.op === "notexists" && c.key === "website") s.website = "without"
  }
  for (const c of clauses) {
    if (c.key === CRAWL_PAGES_KEY && c.op === "gte") {
      const v = toNumberLoose(c.value)
      if (v === 2) s.crawl = "multi"
    }
    if (c.key === CRAWL_PAGES_KEY && c.op === "lt") {
      const v = toNumberLoose(c.value)
      if (v === 2) s.crawl = "none"
    }
  }
  for (const c of clauses) {
    if (isQuickRatingClause(c)) {
      s.minRating = String(c.value) as MinRatingOption
    }
  }
  for (const c of clauses) {
    if (isQuickReviewClause(c)) {
      s.minReviewCount = String(c.value) as MinReviewOption
    }
  }
  for (const c of clauses) {
    if (isQuickScoreClause(c)) {
      s.leadScoreGt = String(c.value) as LeadQuickFiltersState["leadScoreGt"]
    }
  }
  for (const c of clauses) {
    if (c.key === QUICK_OPEN_NOW_KEY && c.op === "eq") {
      const raw = String(c.value ?? "")
      if (raw === "open") s.openNow = "open"
      else if (raw === "closed") s.openNow = "closed"
    }
  }
  for (const c of clauses) {
    if (c.key === "dynamic.website_contacts" && c.op === "exists") {
      s.contacts = "has"
    }
    if (c.key === "dynamic.website_contacts" && c.op === "notexists") {
      s.contacts = "missing"
    }
  }
  return s
}

function toNumberLoose(v: unknown): number | null {
  if (typeof v === "number" && !Number.isNaN(v)) return v
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v)
    return Number.isNaN(n) ? null : n
  }
  return null
}

export function mergeQuickFilters(
  clauses: FilterClause[],
  next: LeadQuickFiltersState,
): FilterClause[] {
  const base = stripQuickFilterClauses(clauses)
  const added = quickFilterClauses(next)
  return [...base, ...added]
}

/** True if any quick dimension is not "all" / "any". */
export function isQuickFilterActive(state: LeadQuickFiltersState): boolean {
  return (
    state.website !== "all" ||
    state.crawl !== "all" ||
    state.minRating !== "any" ||
    state.minReviewCount !== "any" ||
    state.leadScoreGt !== "any" ||
    state.openNow !== "all" ||
    state.contacts !== "all"
  )
}

/** Compare quick state — used to avoid redundant merges. */
export function quickFiltersEqual(a: LeadQuickFiltersState, b: LeadQuickFiltersState): boolean {
  return (
    a.website === b.website &&
    a.crawl === b.crawl &&
    a.minRating === b.minRating &&
    a.minReviewCount === b.minReviewCount &&
    a.leadScoreGt === b.leadScoreGt &&
    a.openNow === b.openNow &&
    a.contacts === b.contacts
  )
}
