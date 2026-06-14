"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AiBrain01Icon,
  Copy01Icon,
  Loading03Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"

import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type State = "idle" | "loading" | "copied" | "error"

/**
 * Fetches the whole-operation strategy bundle (`GET /strategy`) on click and
 * copies it to the clipboard, ready to paste into any AI to get the highest
 * impact-per-effort next action. Builds the text on demand, so it can't use the
 * static `CopyButton` (which takes a fixed `text` prop).
 */
export function CopyStrategyButton({ className }: { className?: string }) {
  const [state, setState] = useState<State>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function run() {
    if (state === "loading") return
    setState("loading")
    setErrorMsg(null)
    try {
      const { prompt } = await api.strategyPrompt()
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        throw new Error("Clipboard unavailable in this browser.")
      }
      await navigator.clipboard.writeText(prompt)
      setState("copied")
      window.setTimeout(() => setState("idle"), 1600)
    } catch (err) {
      setState("error")
      setErrorMsg(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to build strategy prompt.",
      )
      window.setTimeout(() => setState("idle"), 4000)
    }
  }

  const icon =
    state === "loading"
      ? Loading03Icon
      : state === "copied"
        ? Tick02Icon
        : state === "error"
          ? Copy01Icon
          : AiBrain01Icon
  const label =
    state === "loading"
      ? "Building…"
      : state === "copied"
        ? "Copied!"
        : "Copy strategy prompt"

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="brand"
        size="sm"
        onClick={run}
        disabled={state === "loading"}
        className={cn("gap-1.5", className)}
        title="Copy a full snapshot of your operation + a system prompt to paste into any AI for the best next step"
      >
        <HugeiconsIcon
          icon={icon}
          size={14}
          strokeWidth={1.75}
          className={state === "loading" ? "animate-spin" : undefined}
        />
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
