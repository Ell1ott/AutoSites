import type { CSSProperties } from "react"

/** Amber at 1 → green at 10 as an `hsl(...)` color string. */
export function leadScoreHeatFill(score: number | null | undefined): string {
  const n = Math.min(10, Math.max(1, Math.round(score ?? 1)))
  const t = (n - 1) / 9
  const h = 32 + t * 92
  const s = 78 - t * 8
  const l = 42 + t * 10
  return `hsl(${h} ${s}% ${l}%)`
}

/** Amber at 1 → green at 10; flat fill only (no stroke). */
export function leadScoreHeatStyle(
  score: number | null | undefined,
): CSSProperties | undefined {
  if (score == null || Number.isNaN(score)) return undefined
  return {
    backgroundColor: leadScoreHeatFill(score),
    color: "#fff",
  }
}
