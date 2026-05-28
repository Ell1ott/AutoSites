import { readField } from "@/lib/filter"
import { leadScoreHeatStyle } from "@/lib/lead-score-heat"
import { openNowFromLead } from "@/lib/lead-open-now"
import {
  fieldClauseKey,
  FIELD_FORMAT_STARS_1_10,
  type FieldDescriptor,
  type SlimLead,
} from "@/lib/types"

import type { LeadsMapPoint } from "./lead-map-leads"

export const DEFAULT_MAP_COLOR_FIELD = "lead_score"

export const MAP_COLOR_OPEN_NOW = "__open_now"

const MISSING_PIN_COLOR = "oklch(0.55 0.02 260)"

const CURATED_KEYS = new Set([
  DEFAULT_MAP_COLOR_FIELD,
  "dynamic.visual_rating",
  "rating",
  "review_count",
  "website",
  "business_status",
  MAP_COLOR_OPEN_NOW,
])

const STATUS_COLORS: Record<string, string> = {
  OPERATIONAL: "oklch(0.62 0.17 145)",
  CLOSED_TEMPORARILY: "oklch(0.72 0.14 75)",
  CLOSED_PERMANENTLY: "oklch(0.55 0.02 260)",
}

const OPEN_NOW_COLORS = {
  open: "oklch(0.62 0.17 145)",
  closed: "oklch(0.58 0.18 25)",
  unknown: MISSING_PIN_COLOR,
} as const

export type MapColorOption = {
  key: string
  label: string
}

export type PinColorResult = {
  backgroundColor: string
  label?: string
}

export type ColorLegend =
  | {
      kind: "gradient"
      label: string
      stops: Array<{ color: string; label: string }>
    }
  | {
      kind: "categories"
      label: string
      items: Array<{ color: string; label: string }>
    }

export type ResolveColorContext = {
  min?: number
  max?: number
}

function fieldLabel(f: FieldDescriptor): string {
  return f.display && f.display.trim() !== "" ? f.display : f.key
}

function isNumericField(f: FieldDescriptor): boolean {
  return (
    f.type === "integer" ||
    f.type === "number" ||
    f.format === FIELD_FORMAT_STARS_1_10 ||
    f.format === "numeric-string"
  )
}

export function getMapColorOptions(fields: FieldDescriptor[]): MapColorOption[] {
  const out: MapColorOption[] = [
    { key: DEFAULT_MAP_COLOR_FIELD, label: "Lead score" },
    { key: "dynamic.visual_rating", label: "Visual rating" },
    { key: "rating", label: "Google rating" },
    { key: "review_count", label: "Review count" },
    { key: "website", label: "Has website" },
    { key: "business_status", label: "Business status" },
    { key: MAP_COLOR_OPEN_NOW, label: "Open now" },
  ]

  const seen = new Set(out.map((o) => o.key))

  for (const f of fields) {
    if (!isNumericField(f) || f.coverage <= 0) continue
    const key = fieldClauseKey(f)
    if (CURATED_KEYS.has(key) || seen.has(key)) continue
    seen.add(key)
    out.push({ key, label: fieldLabel(f) })
  }

  return out
}

function heatColor(score: number | null | undefined): string | undefined {
  return leadScoreHeatStyle(score)?.backgroundColor
}

function normalizeToHeat(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null
  if (value >= 1 && value <= 10) return Math.round(value)
  if (value >= 0 && value <= 5) return Math.round((value / 5) * 9) + 1
  return null
}

function continuousBlueColor(value: number, min: number, max: number): string {
  if (max <= min) return "oklch(0.55 0.12 250)"
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)))
  const l = 35 + t * 25
  const c = 0.08 + t * 0.1
  return `oklch(${l}% ${c} 250)`
}

function readColorValue(lead: Record<string, unknown>, fieldKey: string): unknown {
  if (fieldKey === MAP_COLOR_OPEN_NOW) return openNowFromLead(lead)
  if (fieldKey === "website") {
    const w = readField(lead, "website")
    return w != null && String(w).trim() !== "" ? true : false
  }
  return readField(lead, fieldKey)
}

export function resolvePinColor(
  fieldKey: string,
  value: unknown,
  context?: ResolveColorContext,
): PinColorResult {
  if (value == null || value === "") {
    return { backgroundColor: MISSING_PIN_COLOR, label: "—" }
  }

  if (fieldKey === MAP_COLOR_OPEN_NOW) {
    if (value === true) {
      return { backgroundColor: OPEN_NOW_COLORS.open, label: "Open" }
    }
    if (value === false) {
      return { backgroundColor: OPEN_NOW_COLORS.closed, label: "Closed" }
    }
    return { backgroundColor: OPEN_NOW_COLORS.unknown, label: "Unknown" }
  }

  if (fieldKey === "website") {
    const has = value === true
    return {
      backgroundColor: has
        ? "oklch(0.62 0.17 145)"
        : MISSING_PIN_COLOR,
      label: has ? "Has website" : "No website",
    }
  }

  if (fieldKey === "business_status") {
    const status = String(value)
    return {
      backgroundColor: STATUS_COLORS[status] ?? MISSING_PIN_COLOR,
      label: status.replaceAll("_", " ").toLowerCase(),
    }
  }

  if (
    fieldKey === DEFAULT_MAP_COLOR_FIELD ||
    fieldKey === "dynamic.visual_rating"
  ) {
    const heat = heatColor(normalizeToHeat(value))
    if (heat) {
      return { backgroundColor: heat, label: String(Math.round(Number(value))) }
    }
    return { backgroundColor: MISSING_PIN_COLOR, label: "—" }
  }

  if (fieldKey === "rating") {
    const heat = heatColor(normalizeToHeat(value))
    if (heat) {
      const n = typeof value === "number" ? value : Number(value)
      return {
        backgroundColor: heat,
        label: Number.isFinite(n) ? n.toFixed(1) : String(value),
      }
    }
    return { backgroundColor: MISSING_PIN_COLOR, label: "—" }
  }

  if (fieldKey === "review_count") {
    const n = typeof value === "number" ? value : Number(value)
    if (!Number.isFinite(n)) {
      return { backgroundColor: MISSING_PIN_COLOR, label: "—" }
    }
    const min = context?.min ?? 0
    const max = context?.max ?? n
    return {
      backgroundColor: continuousBlueColor(n, min, max),
      label: String(Math.round(n)),
    }
  }

  const num = typeof value === "number" ? value : Number(value)
  if (Number.isFinite(num)) {
    const min = context?.min ?? num
    const max = context?.max ?? num
    return {
      backgroundColor: continuousBlueColor(num, min, max),
      label: String(num),
    }
  }

  return {
    backgroundColor: MISSING_PIN_COLOR,
    label: String(value),
  }
}

export function resolveLeadPinColor(
  lead: SlimLead,
  fieldKey: string,
  context?: ResolveColorContext,
): PinColorResult {
  const value = readColorValue(lead as unknown as Record<string, unknown>, fieldKey)
  return resolvePinColor(fieldKey, value, context)
}

export function numericContextForField(
  points: LeadsMapPoint[],
  fieldKey: string,
): ResolveColorContext | undefined {
  if (fieldKey !== "review_count" && !fieldKey.startsWith("dynamic.")) {
    const isGenericNumeric =
      fieldKey !== DEFAULT_MAP_COLOR_FIELD &&
      fieldKey !== "dynamic.visual_rating" &&
      fieldKey !== "rating" &&
      fieldKey !== "website" &&
      fieldKey !== "business_status" &&
      fieldKey !== MAP_COLOR_OPEN_NOW
    if (!isGenericNumeric) return undefined
  }

  if (
    fieldKey !== "review_count" &&
    fieldKey !== DEFAULT_MAP_COLOR_FIELD &&
    fieldKey !== "dynamic.visual_rating" &&
    fieldKey !== "rating"
  ) {
    const nums: number[] = []
    for (const p of points) {
      const v = readColorValue(
        p.lead as unknown as Record<string, unknown>,
        fieldKey,
      )
      const n = typeof v === "number" ? v : Number(v)
      if (Number.isFinite(n)) nums.push(n)
    }
    if (nums.length === 0) return undefined
    return { min: Math.min(...nums), max: Math.max(...nums) }
  }

  if (fieldKey === "review_count") {
    const nums = points
      .map((p) => p.lead.review_count)
      .filter((n): n is number => n != null && Number.isFinite(n))
    if (nums.length === 0) return undefined
    return { min: Math.min(...nums), max: Math.max(...nums) }
  }

  return undefined
}

export function buildColorLegend(
  fieldKey: string,
  points: LeadsMapPoint[],
): ColorLegend | null {
  const option = getMapColorOptions([]).find((o) => o.key === fieldKey)
  const label =
    option?.label ??
    (fieldKey === DEFAULT_MAP_COLOR_FIELD ? "Lead score" : fieldKey)

  if (
    fieldKey === DEFAULT_MAP_COLOR_FIELD ||
    fieldKey === "dynamic.visual_rating" ||
    fieldKey === "rating"
  ) {
    return {
      kind: "gradient",
      label,
      stops: [
        { color: heatColor(1) ?? MISSING_PIN_COLOR, label: "1" },
        { color: heatColor(5) ?? MISSING_PIN_COLOR, label: "5" },
        { color: heatColor(10) ?? MISSING_PIN_COLOR, label: "10" },
      ],
    }
  }

  if (fieldKey === "review_count") {
    const ctx = numericContextForField(points, fieldKey)
    const min = ctx?.min ?? 0
    const max = ctx?.max ?? 100
    return {
      kind: "gradient",
      label,
      stops: [
        { color: continuousBlueColor(min, min, max), label: String(min) },
        {
          color: continuousBlueColor((min + max) / 2, min, max),
          label: String(Math.round((min + max) / 2)),
        },
        { color: continuousBlueColor(max, min, max), label: String(max) },
      ],
    }
  }

  if (fieldKey === "website") {
    return {
      kind: "categories",
      label,
      items: [
        { color: "oklch(0.62 0.17 145)", label: "Has website" },
        { color: MISSING_PIN_COLOR, label: "No website" },
      ],
    }
  }

  if (fieldKey === MAP_COLOR_OPEN_NOW) {
    return {
      kind: "categories",
      label,
      items: [
        { color: OPEN_NOW_COLORS.open, label: "Open" },
        { color: OPEN_NOW_COLORS.closed, label: "Closed" },
        { color: OPEN_NOW_COLORS.unknown, label: "Unknown" },
      ],
    }
  }

  if (fieldKey === "business_status") {
    const seen = new Set<string>()
    const items: Array<{ color: string; label: string }> = []
    for (const p of points) {
      const status = p.lead.business_status
      if (!status || seen.has(status)) continue
      seen.add(status)
      items.push({
        color: STATUS_COLORS[status] ?? MISSING_PIN_COLOR,
        label: status.replaceAll("_", " ").toLowerCase(),
      })
    }
    if (items.length === 0) return null
    return { kind: "categories", label, items }
  }

  const ctx = numericContextForField(points, fieldKey)
  if (ctx && ctx.min != null && ctx.max != null) {
    const { min, max } = ctx
    return {
      kind: "gradient",
      label,
      stops: [
        { color: continuousBlueColor(min, min, max), label: String(min) },
        {
          color: continuousBlueColor((min + max) / 2, min, max),
          label: String(Math.round((min + max) / 2)),
        },
        { color: continuousBlueColor(max, min, max), label: String(max) },
      ],
    }
  }

  return null
}

export function formatColorValue(
  lead: SlimLead,
  fieldKey: string,
): string {
  const value = readColorValue(lead as unknown as Record<string, unknown>, fieldKey)
  if (value == null || value === "") return "—"
  if (fieldKey === MAP_COLOR_OPEN_NOW) {
    if (value === true) return "Open"
    if (value === false) return "Closed"
    return "Unknown"
  }
  if (fieldKey === "website") return value === true ? "Yes" : "No"
  if (fieldKey === "rating" && typeof value === "number") return value.toFixed(1)
  return String(value)
}
