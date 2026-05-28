"use client"

import { cn } from "@/lib/utils"

export const MIN_WORKERS = 1
export const MAX_WORKERS = 32

export const defaultWorkers = (n: number): number =>
  Math.min(MAX_WORKERS, Math.max(MIN_WORKERS, Math.ceil(n / 5)))

export type ParallelStepperVariant = "dark" | "light"

type Props = {
  value: number
  onChange: (next: number) => void
  disabled?: boolean
  variant?: ParallelStepperVariant
  className?: string
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return MIN_WORKERS
  return Math.min(MAX_WORKERS, Math.max(MIN_WORKERS, Math.trunc(n)))
}

export function ParallelStepper({
  value,
  onChange,
  disabled,
  variant = "light",
  className,
}: Props) {
  const v = clamp(value)
  const isDark = variant === "dark"

  const containerCls = isDark
    ? "bg-zinc-800 text-zinc-100 ring-1 ring-zinc-700"
    : "bg-muted text-foreground ring-1 ring-border"
  const btnCls = isDark
    ? "hover:bg-zinc-700 text-zinc-300"
    : "hover:bg-accent text-muted-foreground"
  const labelCls = isDark ? "text-zinc-400" : "text-muted-foreground"

  return (
    <div
      role="group"
      aria-label="Parallel workers"
      title={`Process up to ${v} leads in parallel`}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full px-1.5",
        containerCls,
        disabled && "opacity-60",
        className,
      )}
    >
      <span className={cn("px-1 text-[11px] font-medium", labelCls)}>
        Parallel
      </span>
      <button
        type="button"
        aria-label="Decrease parallel workers"
        onClick={() => onChange(clamp(v - 1))}
        disabled={disabled || v <= MIN_WORKERS}
        className={cn(
          "inline-flex size-5 items-center justify-center rounded-full text-[12px] leading-none",
          btnCls,
          "disabled:cursor-not-allowed disabled:opacity-40",
        )}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={MIN_WORKERS}
        max={MAX_WORKERS}
        value={v}
        onChange={(e) => {
          const next = Number.parseInt(e.target.value, 10)
          if (Number.isFinite(next)) onChange(clamp(next))
        }}
        disabled={disabled}
        aria-label="Parallel workers"
        className={cn(
          "h-5 w-7 bg-transparent text-center text-[12px] font-mono tabular-nums outline-none",
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        )}
      />
      <button
        type="button"
        aria-label="Increase parallel workers"
        onClick={() => onChange(clamp(v + 1))}
        disabled={disabled || v >= MAX_WORKERS}
        className={cn(
          "inline-flex size-5 items-center justify-center rounded-full text-[12px] leading-none",
          btnCls,
          "disabled:cursor-not-allowed disabled:opacity-40",
        )}
      >
        +
      </button>
    </div>
  )
}
