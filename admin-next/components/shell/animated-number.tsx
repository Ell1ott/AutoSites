"use client"
import * as React from "react"

type Props = { value: number; className?: string; format?: (n: number) => string }

export function AnimatedNumber({ value, className, format }: Props) {
  const [display, setDisplay] = React.useState(value)
  const prevRef = React.useRef(value)
  const rafRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    const from = prevRef.current
    const to = value
    if (from === to) return
    const start = performance.now()
    const duration = 600
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      const v = from + (to - from) * eased
      setDisplay(Math.round(v))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else prevRef.current = to
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value])

  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const shown = reduced ? value : display

  return <span className={className}>{format ? format(shown) : shown}</span>
}
