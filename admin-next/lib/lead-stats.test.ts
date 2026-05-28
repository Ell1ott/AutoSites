import { test, expect } from "bun:test"

import {
  computeLeadStats,
  crawlPageCount,
  fieldPopulated,
  isScraped,
  resolveVisualRatingKey,
  statFilterHref,
  visualRatingPopulated,
} from "./lead-stats"
import type { FieldDescriptor, SlimLead } from "./types"

const baseLead = (over: Partial<SlimLead> = {}): SlimLead => ({
  place_id: "x",
  name: "Test",
  rating: null,
  review_count: null,
  website: null,
  business_status: null,
  lead_score: null,
  dynamic: {},
  updated_at: "2026-01-01T00:00:00.000Z",
  ...over,
})

test("fieldPopulated — exists semantics", () => {
  const lead = baseLead({ dynamic: { visuel_rating: "8", empty: "" } })
  expect(fieldPopulated(lead, "dynamic.visuel_rating")).toBe(true)
  expect(fieldPopulated(lead, "dynamic.empty")).toBe(false)
  expect(fieldPopulated(lead, "dynamic.missing")).toBe(false)
})

test("crawlPageCount — dynamic.crawl_pages", () => {
  const lead = baseLead({
    dynamic: { crawl_pages: [{ u: "a" }, { u: "b" }] },
  })
  expect(crawlPageCount(lead)).toBe(2)
})

test("crawlPageCount — data.website_crawl.pages", () => {
  const lead = baseLead({
    data: { website_crawl: { pages: [{ url: "x" }] } },
  })
  expect(crawlPageCount(lead)).toBe(1)
})

test("isScraped — screenshot_path counts", () => {
  const lead = baseLead({ dynamic: { screenshot_path: "foo.png" } })
  expect(isScraped(lead)).toBe(true)
})

test("resolveVisualRatingKey — prefers catalog key", () => {
  const fields: FieldDescriptor[] = [
    {
      key: "visuel_rating",
      type: "string",
      source: "dynamic",
      coverage: 0.6,
    },
  ]
  expect(resolveVisualRatingKey(fields)).toBe("visuel_rating")
})

test("resolveVisualRatingKey — falls back to visual_rating", () => {
  expect(resolveVisualRatingKey([])).toBe("visuel_rating")
})

test("computeLeadStats — aggregates pipeline counts", () => {
  const fields: FieldDescriptor[] = [
    {
      key: "visuel_rating",
      type: "string",
      source: "dynamic",
      coverage: 1,
    },
    {
      key: "design_prompt",
      type: "string",
      source: "dynamic",
      coverage: 0.5,
    },
  ]
  const rows: SlimLead[] = [
    baseLead({
      website: "https://a.com",
      lead_score: 9,
      rating: 4.5,
      dynamic: {
        visuel_rating: "8",
        design_prompt: "brief",
        crawl_pages: [{ u: "a" }],
      },
    }),
    baseLead({
      website: null,
      dynamic: { visuel_rating: "6" },
    }),
  ]

  const stats = computeLeadStats(rows, fields)
  expect(stats.total).toBe(2)
  expect(stats.withWebsite).toBe(1)
  expect(stats.scraped).toBe(1)
  expect(stats.visualScore).toBe(2)
  expect(stats.designBrief).toBe(1)
  expect(stats.userRated).toBe(1)
  expect(stats.leadScoreBuckets[9]).toBe(1)
  expect(stats.visualRatingBuckets[8]).toBe(1)
  expect(stats.visualRatingBuckets[6]).toBe(1)
})

test("visualRatingPopulated — uses resolved key", () => {
  const lead = baseLead({ dynamic: { visual_rating: "7" } })
  expect(visualRatingPopulated(lead, "visual_rating")).toBe(true)
  expect(visualRatingPopulated(lead, "visuel_rating")).toBe(false)
})

test("statFilterHref — builds leads URL with where clauses", () => {
  const href = statFilterHref("visual", "visuel_rating")
  expect(href).toContain("/leads?")
  expect(href).toContain("where%5Bdynamic.visuel_rating%5D%5Bexists%5D=1")
})
