"use client"

import { useCallback, useEffect } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Bookmark01Icon,
  Bookmark02Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Slide = {
  src: string
  label: string
  flagged?: boolean
}

type Props = {
  slides: Slide[]
  index: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onIndexChange: (index: number) => void
  onToggleFlag?: (index: number) => void
}

export function VariantDesignViewer({
  slides,
  index,
  open,
  onOpenChange,
  onIndexChange,
  onToggleFlag,
}: Props): React.JSX.Element | null {
  const slide = slides[index]
  const hasPrev = index > 0
  const hasNext = index < slides.length - 1
  const flagged = !!slide?.flagged

  const close = useCallback(() => onOpenChange(false), [onOpenChange])

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
      if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1)
      if (e.key === "ArrowRight" && index < slides.length - 1)
        onIndexChange(index + 1)
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", onKey)
    }
  }, [open, close, index, slides.length, onIndexChange])

  if (typeof document === "undefined" || !slide) return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="viewer"
          className="fixed inset-0 z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <iframe
            src={slide.src}
            title={slide.label}
            className="absolute inset-0 h-full w-full border-0 bg-background"
            sandbox="allow-same-origin allow-scripts"
            referrerPolicy="no-referrer-when-downgrade"
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4">
            <motion.div
              className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-black/70 px-1.5 py-1.5 text-white shadow-xl backdrop-blur-md"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-30"
                disabled={!hasPrev}
                onClick={() => onIndexChange(index - 1)}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={1.75} />
                <span className="sr-only">Previous design</span>
              </Button>

              <div className="flex items-center gap-1 px-1">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Design ${i + 1}`}
                    aria-current={i === index ? "true" : undefined}
                    onClick={() => onIndexChange(i)}
                    className={cn(
                      "rounded-full transition-all duration-200",
                      i === index
                        ? "h-2 w-2 bg-white"
                        : "h-1.5 w-1.5 bg-white/35 hover:bg-white/60",
                    )}
                  />
                ))}
              </div>

              <span className="min-w-[2.75rem] text-center text-[11px] font-medium tabular-nums text-white/70">
                {index + 1}/{slides.length}
              </span>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-30"
                disabled={!hasNext}
                onClick={() => onIndexChange(index + 1)}
              >
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.75} />
                <span className="sr-only">Next design</span>
              </Button>

              <div className="mx-0.5 h-4 w-px bg-white/15" />

              {onToggleFlag ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={flagged ? "Remove bookmark" : "Bookmark design"}
                  aria-pressed={flagged}
                  className={cn(
                    "text-white/80 hover:bg-white/10 hover:text-white",
                    flagged && "text-amber-300 hover:text-amber-200",
                  )}
                  onClick={() => onToggleFlag(index)}
                >
                  <HugeiconsIcon
                    icon={flagged ? Bookmark01Icon : Bookmark02Icon}
                    strokeWidth={flagged ? 2 : 1.75}
                  />
                  <span className="sr-only">Toggle bookmark</span>
                </Button>
              ) : null}

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-white/80 hover:bg-white/10 hover:text-white"
                onClick={close}
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
                <span className="sr-only">Close</span>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
