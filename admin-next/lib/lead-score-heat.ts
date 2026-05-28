import type { CSSProperties } from "react"

/** Amber at 1 → green at 10; flat fill only (no stroke). */
export function leadScoreHeatStyle(
  score: number | null | undefined,
): CSSProperties | undefined {
  if (score == null || Number.isNaN(score)) return undefined
  const n = Math.min(10, Math.max(1, Math.round(score)))
  const t = (n - 1) / 9
  const h = 32 + t * 92
  const s = 78 - t * 8
  const l = 42 + t * 10
  return {
    backgroundColor: `hsl(${h} ${s}% ${l}%)`,
    color: "#fff",
  }
}
