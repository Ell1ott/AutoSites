import { leadScoreHeatStyle } from "@/lib/lead-score-heat"
import { cn } from "@/lib/utils"

type Props = {
  /** 1–10 lead score, or null when unrated. */
  score: number | null | undefined
  size?: "sm" | "md" | "lg"
  className?: string
}

const SIZES = {
  sm: "h-5 min-w-5 px-1.5 text-[11px]",
  md: "h-6 min-w-6 px-2 text-[12px]",
  lg: "h-7 min-w-7 px-2.5 text-[13px]",
} as const

/**
 * Heat-colored score pill — amber (low) → green (high) — so priority reads at a
 * glance. Falls back to a muted "—" chip when the lead is unrated.
 */
export function LeadScoreBadge({ score, size = "md", className }: Props) {
  const heat = leadScoreHeatStyle(score)
  const base = cn(
    "inline-flex items-center justify-center rounded-full font-semibold tabular-nums leading-none",
    SIZES[size],
    className,
  )

  if (heat == null) {
    return (
      <span
        className={cn(base, "bg-muted text-muted-foreground")}
        aria-label="Unrated"
      >
        —
      </span>
    )
  }

  return (
    <span
      className={cn(base, "shadow-[0_1px_2px_rgba(0,0,0,0.18)] ring-1 ring-white/15")}
      style={heat}
      aria-label={`Lead score ${score} of 10`}
    >
      {score}
    </span>
  )
}
