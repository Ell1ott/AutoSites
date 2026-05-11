"use client"

import * as React from "react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/ai/copy-button"
import { cn } from "@/lib/utils"
import type { AiTask } from "@/lib/types"

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type Props = {
  task: AiTask
  output: unknown
  error?: string
  meta?: {
    duration_ms?: number
    tokens_in?: number
    tokens_out?: number
    cost_usd?: number
    model?: string
    ran_at?: string
  }
  onRerun?: () => void
  className?: string
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function stringify(v: unknown): string {
  if (v == null) return ""
  if (typeof v === "string") return v
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function AiOutputCard({
  task,
  output,
  error,
  meta,
  onRerun,
  className,
}: Props): React.JSX.Element {
  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="font-medium text-sm">{task.label}</div>
        <div className="flex items-center gap-2">
          <MetaLine meta={meta} />
          {output != null || typeof output === "string" ? (
            <CopyButton text={stringify(output)} label="Copy" />
          ) : null}
          {onRerun ? (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={onRerun}
            >
              Re-run
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-3">
        {error ? (
          <ErrorBody error={error} />
        ) : typeof output === "string" ? (
          <pre className="font-mono text-[12.5px] whitespace-pre-wrap">{output}</pre>
        ) : isPlainObject(output) ? (
          <StructuredObject output={output} />
        ) : output == null ? (
          <p className="text-muted-foreground text-sm">No output yet.</p>
        ) : (
          // Arrays / primitives — fall through to a JSON block.
          <details open className="text-[12.5px]">
            <summary className="cursor-pointer text-muted-foreground">
              Output
            </summary>
            <pre className="bg-muted/30 rounded-md mt-2 max-h-72 overflow-auto p-3 font-mono text-[12px]">
              {stringify(output)}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

function MetaLine({ meta }: { meta?: Props["meta"] }): React.JSX.Element | null {
  if (!meta) return null
  const parts: string[] = []
  if (meta.model) parts.push(meta.model)
  if (typeof meta.duration_ms === "number") parts.push(`${meta.duration_ms}ms`)
  if (typeof meta.tokens_in === "number" || typeof meta.tokens_out === "number") {
    parts.push(`${meta.tokens_in ?? 0}→${meta.tokens_out ?? 0}t`)
  }
  if (typeof meta.cost_usd === "number") parts.push(`$${meta.cost_usd.toFixed(3)}`)
  if (parts.length === 0) return null
  return (
    <span className="text-muted-foreground text-[11px]">{parts.join(" · ")}</span>
  )
}

function ErrorBody({ error }: { error: string }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const isMultiline = error.includes("\n")
  if (!isMultiline) {
    return <p className="text-destructive text-[13px]">{error}</p>
  }
  const firstLine = error.split("\n", 1)[0] ?? ""
  return (
    <div className="text-destructive text-[13px]">
      <p>{firstLine}</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground mt-1 text-[11px] underline-offset-2 hover:underline"
      >
        {open ? "Hide details" : "Show details"}
      </button>
      {open ? (
        <pre className="bg-muted/30 mt-2 max-h-64 overflow-auto rounded-md p-3 font-mono text-[12px] whitespace-pre-wrap">
          {error}
        </pre>
      ) : null}
    </div>
  )
}

function StructuredObject({
  output,
}: {
  output: Record<string, unknown>
}): React.JSX.Element {
  const tagline = typeof output.tagline === "string" ? output.tagline : null
  const summary = typeof output.summary === "string" ? output.summary : null
  const subpages = Array.isArray(output.subpages) ? output.subpages : null

  const hasKnownShape = tagline !== null || summary !== null || subpages !== null

  return (
    <div className="flex flex-col gap-3">
      {tagline ? (
        <div className="font-semibold text-[14px]">{tagline}</div>
      ) : null}

      {summary ? (
        <div>
          <div className="text-muted-foreground mb-1 text-[11px] uppercase tracking-wide">
            Summary
          </div>
          <p className="text-[13px] whitespace-pre-wrap">{summary}</p>
        </div>
      ) : null}

      {subpages && subpages.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="text-muted-foreground text-[11px] uppercase tracking-wide">
            Subpages
          </div>
          <div className="flex flex-col gap-2">
            {subpages.map((sp, i) => {
              const obj = isPlainObject(sp) ? sp : null
              const name =
                obj && typeof obj.name === "string"
                  ? obj.name
                  : `Section ${i + 1}`
              const sub =
                obj && typeof obj.summary === "string" ? obj.summary : null
              const text = sub ?? stringify(sp)
              return (
                <div
                  key={i}
                  className="bg-muted/30 rounded-md border px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-[13px]">{name}</div>
                    <CopyButton text={text} label="Copy" />
                  </div>
                  {sub ? (
                    <p className="mt-1 text-[12.5px] whitespace-pre-wrap">
                      {sub}
                    </p>
                  ) : (
                    <pre className="mt-1 max-h-40 overflow-auto font-mono text-[11.5px] whitespace-pre-wrap">
                      {stringify(sp)}
                    </pre>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      <details {...(hasKnownShape ? {} : { open: true })} className="text-[12.5px]">
        <summary className="text-muted-foreground cursor-pointer text-[12px]">
          Show JSON
        </summary>
        <pre className="bg-muted/30 mt-2 max-h-72 overflow-auto rounded-md p-3 font-mono text-[12px]">
          {stringify(output)}
        </pre>
      </details>
    </div>
  )
}
