// URL encoding / decoding for the backend's `where[key][op]=value` & `sort=key:dir`
// query string format. Used by lib/api.ts (request side) and the FilterBuilder
// component (round-trip via URL state).

import type { FilterClause, FilterOp, SortClause } from "./types"

const VALUE_LESS_OPS = new Set<FilterOp>(["exists", "notexists"])

const KNOWN_OPS: ReadonlySet<FilterOp> = new Set<FilterOp>([
  "eq",
  "ne",
  "gt",
  "gte",
  "lt",
  "lte",
  "like",
  "in",
  "exists",
  "notexists",
])

function isFilterOp(s: string): s is FilterOp {
  return KNOWN_OPS.has(s as FilterOp)
}

/**
 * Encode a value for inclusion in a `where[key][op]=value` query parameter.
 * URLSearchParams handles standard URL-encoding on serialise; we only need to
 * convert the value to its string form here.
 */
function encodeValue(op: FilterOp, value: unknown): string {
  if (VALUE_LESS_OPS.has(op)) return "1"
  if (op === "in") {
    if (Array.isArray(value)) {
      return value.map((v) => String(v)).join(",")
    }
    return String(value ?? "")
  }
  if (value === null || value === undefined) return ""
  if (typeof value === "boolean") return value ? "true" : "false"
  return String(value)
}

/**
 * Decode the raw string value for a clause back into the JS type that
 * clausesToParams would have produced from it.
 *
 * For `in`, splits on commas into a string array.
 * For `exists`/`notexists`, returns `undefined` (clause carries no value).
 * Otherwise, returns the raw string.
 */
function decodeValue(op: FilterOp, raw: string): unknown {
  if (VALUE_LESS_OPS.has(op)) return undefined
  if (op === "in") {
    if (raw === "") return []
    return raw.split(",")
  }
  return raw
}

/**
 * Serialise filter clauses and an optional sort clause into URLSearchParams.
 *
 * The bracket syntax (`where[key][op]=value`) is what the FastAPI backend
 * expects. URLSearchParams handles percent-encoding of brackets, commas, etc.,
 * automatically when serialised via `.toString()` — but the dot in keys like
 * `dynamic.visual_rating` stays literal because URLSearchParams does not
 * percent-encode dots.
 */
export function clausesToParams(
  filters: FilterClause[],
  sort?: SortClause,
): URLSearchParams {
  const params = new URLSearchParams()
  for (const clause of filters) {
    const name = `where[${clause.key}][${clause.op}]`
    params.append(name, encodeValue(clause.op, clause.value))
  }
  if (sort) {
    params.set("sort", `${sort.key}:${sort.dir}`)
  }
  return params
}

const WHERE_PATTERN = /^where\[(.+)\]\[([^\]]+)\]$/

/**
 * Parse URLSearchParams back into filter clauses + optional sort. Inverse of
 * clausesToParams modulo ordering of clauses.
 *
 * Unknown operators are skipped silently. Unknown sort dirs default to "asc".
 */
export function paramsToClauses(params: URLSearchParams): {
  filters: FilterClause[]
  sort?: SortClause
} {
  const filters: FilterClause[] = []
  let sort: SortClause | undefined

  for (const [rawName, rawValue] of params.entries()) {
    if (rawName === "sort") {
      const [key, dir] = rawValue.split(":")
      if (key) {
        sort = { key, dir: dir === "desc" ? "desc" : "asc" }
      }
      continue
    }
    const match = WHERE_PATTERN.exec(rawName)
    if (!match) continue
    const [, key, opRaw] = match
    if (!isFilterOp(opRaw)) continue
    const op: FilterOp = opRaw
    if (VALUE_LESS_OPS.has(op)) {
      filters.push({ key, op })
    } else {
      filters.push({ key, op, value: decodeValue(op, rawValue) })
    }
  }

  return sort ? { filters, sort } : { filters }
}
