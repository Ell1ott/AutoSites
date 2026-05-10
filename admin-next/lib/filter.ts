// Pure, in-memory filter + sort engine that mirrors the backend's operator
// semantics. Used to compute the visible row set on every keystroke without a
// network round-trip. No React, no I/O — just typed functions over plain data.
//
// The backend FastAPI side enforces the same operators on its `/leads` route
// using SQL. This module's job is to stay behavior-compatible with that.

import {
  FIELD_FORMAT_NUMERIC_STRING,
  type FieldDescriptor,
  type FieldType,
  type FilterClause,
  type FilterOp,
  type SortClause,
} from "./types"

// -----------------------------------------------------------------------------
// readField — resolve a clause key against a lead row.
// -----------------------------------------------------------------------------

const DYNAMIC_PREFIX = "dynamic."

/**
 * Resolve a key path against a lead.
 *
 * Supports three forms:
 *   - "name"                  → lead.name
 *   - "dynamic.visual_rating" → lead.dynamic.visual_rating
 *   - "visual_rating"         → falls through to lead.dynamic.visual_rating
 *                               when the key is not a top-level lead field.
 *
 * Returns undefined when the key is not found anywhere.
 */
export function readField(
  lead: Record<string, unknown>,
  key: string,
): unknown {
  if (key.startsWith(DYNAMIC_PREFIX)) {
    const sub = key.slice(DYNAMIC_PREFIX.length)
    const dyn = lead.dynamic
    if (dyn && typeof dyn === "object") {
      return (dyn as Record<string, unknown>)[sub]
    }
    return undefined
  }
  if (Object.prototype.hasOwnProperty.call(lead, key)) {
    return (lead as Record<string, unknown>)[key]
  }
  const dyn = lead.dynamic
  if (dyn && typeof dyn === "object") {
    return (dyn as Record<string, unknown>)[key]
  }
  return undefined
}

// -----------------------------------------------------------------------------
// Type / format inference helpers
// -----------------------------------------------------------------------------

function isNumericType(t: FieldType | undefined): boolean {
  return t === "integer" || t === "number"
}

function isArrayType(t: FieldType | undefined): boolean {
  if (!t) return false
  return t === "array" || t.startsWith("array<")
}

function fieldByKey(
  key: string,
  fields?: FieldDescriptor[],
): FieldDescriptor | undefined {
  if (!fields) return undefined
  // Try the literal key first, then a `dynamic.`-stripped variant, then a
  // `dynamic.`-prefixed variant, so callers can pass either form.
  let f = fields.find((x) => x.key === key)
  if (f) return f
  if (key.startsWith(DYNAMIC_PREFIX)) {
    f = fields.find((x) => x.key === key.slice(DYNAMIC_PREFIX.length))
    if (f) return f
  } else {
    f = fields.find((x) => x.key === DYNAMIC_PREFIX + key)
    if (f) return f
  }
  return undefined
}

/**
 * Treat a field as numeric when its declared type is integer/number OR when
 * its declared format is "numeric-string" (e.g. legacy columns stored as text).
 */
function isFieldNumeric(field?: FieldDescriptor): boolean {
  if (!field) return false
  if (isNumericType(field.type)) return true
  if (field.format === FIELD_FORMAT_NUMERIC_STRING) return true
  return false
}

// -----------------------------------------------------------------------------
// Value coercion
// -----------------------------------------------------------------------------

/**
 * Coerce a possibly-string value into a number when meaningful. Returns NaN
 * on failure so callers can short-circuit a comparison.
 */
function toNumber(v: unknown): number {
  if (typeof v === "number") return v
  if (typeof v === "string" && v.trim() !== "") return Number(v)
  if (typeof v === "boolean") return v ? 1 : 0
  return NaN
}

function toBool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v
  if (typeof v === "string") {
    const s = v.toLowerCase().trim()
    if (s === "true" || s === "1" || s === "yes") return true
    if (s === "false" || s === "0" || s === "no" || s === "") return false
  }
  if (typeof v === "number") return v !== 0
  return undefined
}

/**
 * Normalize an `in`-operator clause value into an array of primitives. Accepts
 * either an array or a comma-separated string.
 */
function toArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v
  if (v === undefined || v === null) return []
  if (typeof v === "string") {
    if (v === "") return []
    return v.split(",").map((s) => s.trim())
  }
  return [v]
}

// -----------------------------------------------------------------------------
// existence test
// -----------------------------------------------------------------------------

function valueExists(v: unknown): boolean {
  if (v === undefined || v === null) return false
  if (typeof v === "string") return v.length > 0
  return true
}

// -----------------------------------------------------------------------------
// Comparators
// -----------------------------------------------------------------------------

function looseEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || a === undefined || b === null || b === undefined) {
    return false
  }
  // Number-versus-numeric-string equality: coerce when both can be coerced.
  if (typeof a === "number" || typeof b === "number") {
    const na = toNumber(a)
    const nb = toNumber(b)
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na === nb
  }
  if (typeof a === "boolean" || typeof b === "boolean") {
    const ba = toBool(a)
    const bb = toBool(b)
    if (ba !== undefined && bb !== undefined) return ba === bb
  }
  return String(a) === String(b)
}

function numericCompare(
  fieldValue: unknown,
  clauseValue: unknown,
): number | null {
  const fv = toNumber(fieldValue)
  const cv = toNumber(clauseValue)
  if (Number.isNaN(fv) || Number.isNaN(cv)) return null
  if (fv < cv) return -1
  if (fv > cv) return 1
  return 0
}

// -----------------------------------------------------------------------------
// evalClause
// -----------------------------------------------------------------------------

export function evalClause(
  lead: Record<string, unknown>,
  clause: FilterClause,
  fields?: FieldDescriptor[],
): boolean {
  const field = fieldByKey(clause.key, fields)
  const value = readField(lead, clause.key)
  const op: FilterOp = clause.op

  switch (op) {
    case "exists":
      return valueExists(value)
    case "notexists":
      return !valueExists(value)
    case "eq":
      return looseEqual(value, clause.value)
    case "ne":
      return !looseEqual(value, clause.value)
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const cmp = numericCompare(value, clause.value)
      if (cmp === null) return false
      if (op === "gt") return cmp > 0
      if (op === "gte") return cmp >= 0
      if (op === "lt") return cmp < 0
      return cmp <= 0
    }
    case "like": {
      if (value === null || value === undefined) return false
      const needle = String(clause.value ?? "").toLowerCase()
      if (needle === "") return true
      return String(value).toLowerCase().includes(needle)
    }
    case "in": {
      const wanted = toArray(clause.value)
      if (wanted.length === 0) return false
      // Array-typed field: membership when any element matches any wanted.
      if (Array.isArray(value) || isArrayType(field?.type)) {
        const arr = Array.isArray(value) ? value : value !== undefined ? [value] : []
        return arr.some((el) => wanted.some((w) => looseEqual(el, w)))
      }
      return wanted.some((w) => looseEqual(value, w))
    }
    default: {
      // Forward-compat: unknown operator never matches.
      return false
    }
  }
}

// -----------------------------------------------------------------------------
// evalFilters
// -----------------------------------------------------------------------------

export function evalFilters(
  lead: Record<string, unknown>,
  clauses: FilterClause[],
  fields?: FieldDescriptor[],
): boolean {
  for (const c of clauses) {
    if (!evalClause(lead, c, fields)) return false
  }
  return true
}

// -----------------------------------------------------------------------------
// applyFiltersAndSort
// -----------------------------------------------------------------------------

type SortKind = "number" | "string" | "boolean"

function inferSortKind(
  sample: unknown,
  field: FieldDescriptor | undefined,
): SortKind {
  if (field) {
    if (isFieldNumeric(field)) return "number"
    if (field.type === "boolean") return "boolean"
    return "string"
  }
  if (typeof sample === "number") return "number"
  if (typeof sample === "boolean") return "boolean"
  return "string"
}

function compareSortable(
  a: unknown,
  b: unknown,
  kind: SortKind,
  dir: "asc" | "desc",
): number {
  const aMissing = a === undefined || a === null || a === ""
  const bMissing = b === undefined || b === null || b === ""
  // Nullish values sort last regardless of direction.
  if (aMissing && bMissing) return 0
  if (aMissing) return 1
  if (bMissing) return -1

  let cmp = 0
  if (kind === "number") {
    const na = toNumber(a)
    const nb = toNumber(b)
    // If coercion fails on either side, fall back to string compare.
    if (Number.isNaN(na) || Number.isNaN(nb)) {
      cmp = String(a).localeCompare(String(b))
    } else if (na < nb) cmp = -1
    else if (na > nb) cmp = 1
    else cmp = 0
  } else if (kind === "boolean") {
    const ba = toBool(a) ?? false
    const bb = toBool(b) ?? false
    cmp = ba === bb ? 0 : ba ? 1 : -1
  } else {
    cmp = String(a).localeCompare(String(b))
  }
  return dir === "desc" ? -cmp : cmp
}

export function applyFiltersAndSort<T extends Record<string, unknown>>(
  rows: T[],
  clauses: FilterClause[],
  sort?: SortClause,
  fields?: FieldDescriptor[],
): T[] {
  const filtered = clauses.length
    ? rows.filter((r) => evalFilters(r, clauses, fields))
    : rows.slice()

  if (!sort) return filtered

  const field = fieldByKey(sort.key, fields)
  // Pick a non-nullish sample to infer kind when we don't have a field schema.
  let sample: unknown
  for (const r of filtered) {
    const v = readField(r, sort.key)
    if (v !== undefined && v !== null && v !== "") {
      sample = v
      break
    }
  }
  const kind = inferSortKind(sample, field)

  const indexed = filtered.map((row, i) => ({
    row,
    val: readField(row, sort.key),
    i,
  }))
  indexed.sort((x, y) => {
    const c = compareSortable(x.val, y.val, kind, sort.dir)
    return c !== 0 ? c : x.i - y.i
  })
  return indexed.map((x) => x.row)
}

// -----------------------------------------------------------------------------
// UI helpers — operatorsForField, valueWidgetForField
// -----------------------------------------------------------------------------

const COMMON_EXISTS: FilterOp[] = ["exists", "notexists"]

export function operatorsForField(field: FieldDescriptor): FilterOp[] {
  if (field.enum_values && field.enum_values.length > 0) {
    return ["eq", "ne", "in", ...COMMON_EXISTS]
  }
  if (isFieldNumeric(field)) {
    return ["eq", "ne", "gt", "gte", "lt", "lte", "in", ...COMMON_EXISTS]
  }
  switch (field.type) {
    case "string":
      return ["eq", "ne", "like", "in", ...COMMON_EXISTS]
    case "boolean":
      return ["eq", ...COMMON_EXISTS]
    case "object":
      return [...COMMON_EXISTS]
    default:
      if (isArrayType(field.type)) {
        return ["in", ...COMMON_EXISTS]
      }
      return ["eq", "ne", ...COMMON_EXISTS]
  }
}

export function valueWidgetForField(
  field: FieldDescriptor,
):
  | "text"
  | "number"
  | "boolean"
  | "select"
  | "multiselect"
  | "stars-1-10"
  | "none" {
  if (field.enum_values && field.enum_values.length > 0) {
    return "select"
  }
  if (field.format === "stars-1-10") return "stars-1-10"
  if (isFieldNumeric(field)) return "number"
  switch (field.type) {
    case "boolean":
      return "boolean"
    case "object":
      return "none"
    case "string":
      return "text"
    default:
      if (isArrayType(field.type)) return "multiselect"
      return "text"
  }
}
