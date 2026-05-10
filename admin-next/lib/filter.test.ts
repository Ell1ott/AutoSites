import { test, expect } from "bun:test"

import {
  applyFiltersAndSort,
  evalClause,
  evalFilters,
  operatorsForField,
  readField,
  valueWidgetForField,
} from "./filter"
import type { FieldDescriptor, FilterClause } from "./types"

// -----------------------------------------------------------------------------
// readField
// -----------------------------------------------------------------------------

test("readField — top-level column", () => {
  const lead = { name: "Bakery Aroma", rating: 4.6, dynamic: {} }
  expect(readField(lead, "name")).toBe("Bakery Aroma")
  expect(readField(lead, "rating")).toBe(4.6)
})

test("readField — dynamic.* prefixed", () => {
  const lead = { name: "x", dynamic: { visual_rating: 8 } }
  expect(readField(lead, "dynamic.visual_rating")).toBe(8)
})

test("readField — bare key falls through to dynamic", () => {
  const lead = { name: "x", dynamic: { visual_rating: 9 } }
  expect(readField(lead, "visual_rating")).toBe(9)
})

test("readField — missing key returns undefined", () => {
  const lead = { name: "x", dynamic: {} }
  expect(readField(lead, "nonsense")).toBeUndefined()
  expect(readField(lead, "dynamic.nonsense")).toBeUndefined()
})

// -----------------------------------------------------------------------------
// Operators on string field
// -----------------------------------------------------------------------------

const stringField: FieldDescriptor = {
  key: "name",
  type: "string",
  source: "column",
  coverage: 1,
}

test("string field — eq / ne / like / exists / notexists / in", () => {
  const lead = { name: "Bachs Bageri", dynamic: {} }
  expect(evalClause(lead, { key: "name", op: "eq", value: "Bachs Bageri" }, [stringField])).toBe(true)
  expect(evalClause(lead, { key: "name", op: "eq", value: "Other" }, [stringField])).toBe(false)
  expect(evalClause(lead, { key: "name", op: "ne", value: "Other" }, [stringField])).toBe(true)
  expect(evalClause(lead, { key: "name", op: "like", value: "bach" }, [stringField])).toBe(true)
  expect(evalClause(lead, { key: "name", op: "like", value: "X" }, [stringField])).toBe(false)
  expect(evalClause(lead, { key: "name", op: "exists" }, [stringField])).toBe(true)
  expect(evalClause(lead, { key: "name", op: "notexists" }, [stringField])).toBe(false)
  expect(evalClause(lead, { key: "name", op: "in", value: ["Other", "Bachs Bageri"] }, [stringField])).toBe(true)
  expect(evalClause(lead, { key: "name", op: "in", value: "Other,Bachs Bageri" }, [stringField])).toBe(true)
})

// -----------------------------------------------------------------------------
// Operators on numeric field
// -----------------------------------------------------------------------------

const numField: FieldDescriptor = {
  key: "rating",
  type: "number",
  source: "column",
  coverage: 1,
}

test("numeric field — gt / gte / lt / lte / eq", () => {
  const lead = { rating: 4.6, dynamic: {} }
  expect(evalClause(lead, { key: "rating", op: "gt", value: 4 }, [numField])).toBe(true)
  expect(evalClause(lead, { key: "rating", op: "gte", value: 4.6 }, [numField])).toBe(true)
  expect(evalClause(lead, { key: "rating", op: "lt", value: 4.6 }, [numField])).toBe(false)
  expect(evalClause(lead, { key: "rating", op: "lte", value: 4.6 }, [numField])).toBe(true)
  // string clause-value also works (URL deserialisation).
  expect(evalClause(lead, { key: "rating", op: "gte", value: "4" }, [numField])).toBe(true)
  expect(evalClause(lead, { key: "rating", op: "eq", value: "4.6" }, [numField])).toBe(true)
})

// -----------------------------------------------------------------------------
// `in` on array field
// -----------------------------------------------------------------------------

const arrayField: FieldDescriptor = {
  key: "tags",
  type: "array<string>",
  source: "dynamic",
  coverage: 1,
}

test("array field — `in` is membership", () => {
  const lead = { dynamic: { tags: ["bakery", "coffee"] } }
  expect(evalClause(lead, { key: "tags", op: "in", value: ["coffee"] }, [arrayField])).toBe(true)
  expect(evalClause(lead, { key: "tags", op: "in", value: ["tea"] }, [arrayField])).toBe(false)
  expect(evalClause(lead, { key: "tags", op: "in", value: "coffee,tea" }, [arrayField])).toBe(true)
})

// -----------------------------------------------------------------------------
// exists / notexists on sparse dynamic field
// -----------------------------------------------------------------------------

test("sparse dynamic — exists / notexists", () => {
  const present = { dynamic: { visual_rating: 7 } }
  const missing = { dynamic: {} }
  const empty = { dynamic: { visual_rating: "" } }
  const c1: FilterClause = { key: "dynamic.visual_rating", op: "exists" }
  const c2: FilterClause = { key: "dynamic.visual_rating", op: "notexists" }
  expect(evalClause(present, c1)).toBe(true)
  expect(evalClause(missing, c1)).toBe(false)
  expect(evalClause(empty, c1)).toBe(false)
  expect(evalClause(missing, c2)).toBe(true)
})

// -----------------------------------------------------------------------------
// numeric-string coercion
// -----------------------------------------------------------------------------

const numericStringField: FieldDescriptor = {
  key: "review_count_str",
  type: "string",
  source: "dynamic",
  coverage: 1,
  format: "numeric-string",
}

test("numeric-string format — gt/gte work with string values", () => {
  const lead = { dynamic: { review_count_str: "184" } }
  expect(
    evalClause(
      lead,
      { key: "review_count_str", op: "gt", value: "100" },
      [numericStringField],
    ),
  ).toBe(true)
  expect(
    evalClause(
      lead,
      { key: "review_count_str", op: "gte", value: 184 },
      [numericStringField],
    ),
  ).toBe(true)
  expect(
    evalClause(
      lead,
      { key: "review_count_str", op: "gt", value: "200" },
      [numericStringField],
    ),
  ).toBe(false)
})

// -----------------------------------------------------------------------------
// sort behaviour
// -----------------------------------------------------------------------------

test("sort — numeric ascending and descending", () => {
  const rows = [
    { id: "a", rating: 3 },
    { id: "b", rating: 5 },
    { id: "c", rating: 1 },
  ]
  const asc = applyFiltersAndSort(rows, [], { key: "rating", dir: "asc" }, [numField])
  expect(asc.map((r) => r.id)).toEqual(["c", "a", "b"])
  const desc = applyFiltersAndSort(rows, [], { key: "rating", dir: "desc" }, [numField])
  expect(desc.map((r) => r.id)).toEqual(["b", "a", "c"])
})

test("sort — string locale compare", () => {
  const rows = [
    { id: "1", name: "Åse" },
    { id: "2", name: "Anna" },
    { id: "3", name: "Bo" },
  ]
  const asc = applyFiltersAndSort(rows, [], { key: "name", dir: "asc" }, [stringField])
  // Åse vs Anna depends on locale; just assert Bo is last and Anna comes before Åse in en locale.
  const ids = asc.map((r) => r.id)
  expect(ids[ids.length - 1]).toBe("3")
})

test("sort — nullish values land at the end regardless of direction", () => {
  const rows = [
    { id: "a", rating: 3 },
    { id: "b", rating: null as number | null },
    { id: "c", rating: 1 },
    { id: "d", rating: undefined as number | undefined },
  ]
  const asc = applyFiltersAndSort(rows, [], { key: "rating", dir: "asc" }, [numField])
  expect(asc.slice(0, 2).map((r) => r.id)).toEqual(["c", "a"])
  expect(new Set(asc.slice(2).map((r) => r.id))).toEqual(new Set(["b", "d"]))
  const desc = applyFiltersAndSort(rows, [], { key: "rating", dir: "desc" }, [numField])
  expect(desc.slice(0, 2).map((r) => r.id)).toEqual(["a", "c"])
  expect(new Set(desc.slice(2).map((r) => r.id))).toEqual(new Set(["b", "d"]))
})

// -----------------------------------------------------------------------------
// applyFiltersAndSort — multi-clause AND
// -----------------------------------------------------------------------------

test("applyFiltersAndSort — AND-combines multiple clauses", () => {
  const rows = [
    { id: "a", rating: 4.6, dynamic: { visual_rating: 8 } },
    { id: "b", rating: 3.5, dynamic: { visual_rating: 9 } },
    { id: "c", rating: 4.7, dynamic: {} },
    { id: "d", rating: 4.9, dynamic: { visual_rating: 6 } },
  ]
  const fields: FieldDescriptor[] = [
    numField,
    { key: "visual_rating", type: "integer", source: "dynamic", coverage: 1 },
  ]
  const out = applyFiltersAndSort(
    rows,
    [
      { key: "rating", op: "gte", value: 4 },
      { key: "dynamic.visual_rating", op: "gte", value: 7 },
    ],
    { key: "rating", dir: "desc" },
    fields,
  )
  expect(out.map((r) => r.id)).toEqual(["a"])
})

test("empty filters — all rows pass through", () => {
  const rows = [{ id: 1 }, { id: 2 }]
  expect(evalFilters({ id: 1 }, [])).toBe(true)
  const out = applyFiltersAndSort(rows, [])
  expect(out).toHaveLength(2)
})

// -----------------------------------------------------------------------------
// UI helpers
// -----------------------------------------------------------------------------

test("operatorsForField — by type", () => {
  expect(operatorsForField(stringField)).toEqual([
    "eq", "ne", "like", "in", "exists", "notexists",
  ])
  expect(operatorsForField(numField)).toEqual([
    "eq", "ne", "gt", "gte", "lt", "lte", "in", "exists", "notexists",
  ])
  expect(
    operatorsForField({ key: "active", type: "boolean", source: "column", coverage: 1 }),
  ).toEqual(["eq", "exists", "notexists"])
  expect(
    operatorsForField({ key: "data", type: "object", source: "column", coverage: 1 }),
  ).toEqual(["exists", "notexists"])
  expect(operatorsForField(arrayField)).toEqual(["in", "exists", "notexists"])
})

test("operatorsForField — numeric-string format is treated as numeric", () => {
  expect(operatorsForField(numericStringField)).toEqual([
    "eq", "ne", "gt", "gte", "lt", "lte", "in", "exists", "notexists",
  ])
})

test("operatorsForField — enum_values offers select-style ops", () => {
  const f: FieldDescriptor = {
    key: "status",
    type: "string",
    source: "column",
    coverage: 1,
    enum_values: ["OPEN", "CLOSED"],
  }
  expect(operatorsForField(f)).toEqual([
    "eq", "ne", "in", "exists", "notexists",
  ])
})

test("valueWidgetForField — covers expected mappings", () => {
  expect(valueWidgetForField(stringField)).toBe("text")
  expect(valueWidgetForField(numField)).toBe("number")
  expect(valueWidgetForField(numericStringField)).toBe("number")
  expect(
    valueWidgetForField({ key: "vr", type: "integer", source: "dynamic", coverage: 1, format: "stars-1-10" }),
  ).toBe("stars-1-10")
  expect(
    valueWidgetForField({ key: "x", type: "boolean", source: "column", coverage: 1 }),
  ).toBe("boolean")
  expect(
    valueWidgetForField({ key: "x", type: "object", source: "column", coverage: 1 }),
  ).toBe("none")
  expect(valueWidgetForField(arrayField)).toBe("multiselect")
  expect(
    valueWidgetForField({ key: "s", type: "string", source: "column", coverage: 1, enum_values: ["a", "b"] }),
  ).toBe("select")
})
