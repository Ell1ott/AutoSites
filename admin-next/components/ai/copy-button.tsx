"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  /** The text to write to the clipboard. */
  text: string
  /** Visible button label. When omitted the button is icon-only. */
  label?: string
  /** Optional aria-label override (defaults to "Copy"). */
  ariaLabel?: string
  className?: string
  /** Override button size. Default "xs". */
  size?: "xs" | "sm" | "default"
}

/**
 * Tiny ghost button that copies a string to the clipboard. Briefly swaps the
 * icon to a checkmark so the user gets visual feedback. Falls back silently
 * when navigator.clipboard is unavailable (eg older browsers).
 */
export function CopyButton({
  text,
  label,
  ariaLabel,
  className,
  size = "xs",
}: Props) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      // Ignore — clipboard permissions can fail silently in dev.
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      onClick={copy}
      aria-label={ariaLabel ?? "Copy"}
      className={cn("gap-1", className)}
    >
      <HugeiconsIcon
        icon={copied ? Tick02Icon : Copy01Icon}
        size={12}
        strokeWidth={1.75}
      />
      {label ? <span>{copied ? "Copied" : label}</span> : null}
    </Button>
  )
}
