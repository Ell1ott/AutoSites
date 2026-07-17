"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AiBrain01Icon,
  Copy01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatMapsDataForAi } from "@/lib/format-maps-ai-prompt"
import type { SlimLead } from "@/lib/types"
import { cn } from "@/lib/utils"

type State = "idle" | "copied" | "error"

type Props = {
  lead: SlimLead
  /** Icon-only (header quick actions) vs labeled button (contact tab). */
  variant?: "icon" | "labeled"
  className?: string
}

/**
 * Copies an AI-optimized Google Maps listing brief to the clipboard so you
 * can paste it into any model to draft/adapt a website for the store.
 */
export function CopyMapsDataButton({
  lead,
  variant = "labeled",
  className,
}: Props) {
  const [state, setState] = useState<State>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function run() {
    setErrorMsg(null)
    try {
      const text = formatMapsDataForAi(lead)
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        throw new Error("Clipboard unavailable in this browser.")
      }
      await navigator.clipboard.writeText(text)
      setState("copied")
      window.setTimeout(() => setState("idle"), 1600)
    } catch (err) {
      setState("error")
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to copy Maps data.",
      )
      window.setTimeout(() => setState("idle"), 4000)
    }
  }

  const icon =
    state === "copied"
      ? Tick02Icon
      : state === "error"
        ? Copy01Icon
        : AiBrain01Icon

  const label =
    state === "copied"
      ? "Copied!"
      : state === "error"
        ? "Copy failed"
        : "Copy Maps data for AI"

  const title =
    "Copy Google Maps listing data as an AI-readable brief for creating a website"

  if (variant === "icon") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={run}
            aria-label={label}
            title={title}
            className={className}
          >
            <HugeiconsIcon icon={icon} size={16} strokeWidth={1.75} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {state === "error" && errorMsg ? errorMsg : label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={run}
        className={cn("gap-1.5", className)}
        title={title}
      >
        <HugeiconsIcon icon={icon} size={14} strokeWidth={1.75} />
        <span>{label}</span>
      </Button>
      {state === "error" && errorMsg ? (
        <span className="max-w-[260px] text-right text-[11px] text-destructive">
          {errorMsg}
        </span>
      ) : null}
    </div>
  )
}
