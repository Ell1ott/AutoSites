import { test, expect } from "bun:test"

import { clausesToParams, paramsToClauses } from "./url"
import type { FilterClause, SortClause } from "./types"

function roundTrip(filters: FilterClause[], sort?: SortClause) {
  const params = clausesToParams(filters, sort)
  return paramsToClauses(new URLSearchParams(params.toString()))
}

test("simple eq filter encodes and decodes", () => {
  const filters: FilterClause[] = [
    { key: "business_status", op: "eq", value: "OPERATIONAL" },
  ]
  const params = clausesToParams(filters)
  // URLSearchParams percent-encodes the brackets when serialised.
  expect(params.toString()).toBe(
    "where%5Bbusiness_status%5D%5Beq%5D=OPERATIONAL",
  )
  expect(roundTrip(filters)).toEqual({ filters })
})

test("multiple filters round-trip", () => {
  const filters: FilterClause[] = [
    { key: "lead_score", op: "gte", value: "7" },
    { key: "rating", op: "lt", value: "5" },
  ]
  expect(roundTrip(filters)).toEqual({ filters })
})

test("`in` op encodes as comma-joined list and decodes to string[]", () => {
  const filters: FilterClause[] = [
    { key: "tags", op: "in", value: ["bakery", "coffee"] },
  ]
  const params = clausesToParams(filters)
  // The raw value after percent-decoding should be "bakery,coffee".
  expect(decodeURIComponent(params.toString())).toBe(
    "where[tags][in]=bakery,coffee",
  )
  const decoded = paramsToClauses(new URLSearchParams(params.toString()))
  expect(decoded.filters).toEqual([
    { key: "tags", op: "in", value: ["bakery", "coffee"] },
  ])
})

test("`exists` op encodes as =1 and decodes without value", () => {
  const filters: FilterClause[] = [{ key: "visual_rating", op: "exists" }]
  const params = clausesToParams(filters)
  expect(decodeURIComponent(params.toString())).toBe(
    "where[visual_rating][exists]=1",
  )
  const decoded = paramsToClauses(new URLSearchParams(params.toString()))
  expect(decoded.filters).toEqual([{ key: "visual_rating", op: "exists" }])
})

test("`notexists` op encodes as =1 and decodes without value", () => {
  const filters: FilterClause[] = [{ key: "website", op: "notexists" }]
  expect(roundTrip(filters)).toEqual({ filters })
})

test("sort serialises as `sort=key:dir` and round-trips", () => {
  const params = clausesToParams([], { key: "lead_score", dir: "desc" })
  expect(params.get("sort")).toBe("lead_score:desc")
  const decoded = paramsToClauses(new URLSearchParams(params.toString()))
  expect(decoded.sort).toEqual({ key: "lead_score", dir: "desc" })
  expect(decoded.filters).toEqual([])
})

test("empty params decode to empty filters and no sort", () => {
  expect(paramsToClauses(new URLSearchParams())).toEqual({ filters: [] })
})

test("dotted dynamic keys round-trip without losing the dot", () => {
  const filters: FilterClause[] = [
    { key: "dynamic.visual_rating", op: "gte", value: "7" },
  ]
  const params = clausesToParams(filters)
  // The dot stays literal — not percent-encoded.
  expect(decodeURIComponent(params.toString())).toBe(
    "where[dynamic.visual_rating][gte]=7",
  )
  expect(roundTrip(filters)).toEqual({ filters })
})

test("full round-trip with filters + sort + multiple clauses on same key", () => {
  const filters: FilterClause[] = [
    { key: "lead_score", op: "gte", value: "5" },
    { key: "lead_score", op: "lte", value: "9" },
    { key: "website", op: "exists" },
    { key: "dynamic.has_email", op: "eq", value: "true" },
  ]
  const sort: SortClause = { key: "updated_at", dir: "desc" }
  expect(roundTrip(filters, sort)).toEqual({ filters, sort })
})

test("unknown operator is skipped", () => {
  const params = new URLSearchParams()
  params.append("where[name][weirdop]", "x")
  params.append("where[name][eq]", "Bakery")
  const decoded = paramsToClauses(params)
  expect(decoded.filters).toEqual([
    { key: "name", op: "eq", value: "Bakery" },
  ])
})
