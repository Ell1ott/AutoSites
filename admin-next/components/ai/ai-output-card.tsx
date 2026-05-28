"use client"

import * as React from "react"
import { useState } from "react"

import { AiMarkdown } from "@/components/ai/ai-markdown"
import { CopyButton } from "@/components/ai/copy-button"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  isVariantDesignResult,
  VariantDesignGrid,
} from "@/components/leads/variant-design-grid"
import { getPiBackendBase } from "@/lib/pi-url"
import type { AiTask, InspirationPick } from "@/lib/types"

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

function isInspirationList(v: unknown): v is InspirationPick[] {
  if (!Array.isArray(v) || v.length === 0) return false
  return v.every(
    (item) =>
      isPlainObject(item) &&
      typeof item.url === "string" &&
      typeof item.title === "string",
  )
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
          <AiMarkdown>{output}</AiMarkdown>
        ) : isInspirationList(output) ? (
          <InspirationGrid picks={output} />
        ) : isVariantDesignResult(output) ? (
          <VariantDesignGrid result={output} />
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

function InspirationGrid({
  picks,
}: {
  picks: InspirationPick[]
}): React.JSX.Element {
  const base = getPiBackendBase()
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {picks.map((pick, i) => {
        const shotUrl =
          pick.screenshot && base
            ? `${base}/screenshots/${pick.screenshot
                .split("/")
                .map(encodeURIComponent)
                .join("/")}`
            : null
        return (
          <a
            key={`${pick.url}-${i}`}
            href={pick.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-1 rounded-md border bg-muted/20 p-1.5 transition-colors hover:bg-muted/40"
            title={pick.why ?? pick.title}
          >
            <div className="aspect-[16/10] w-full overflow-hidden rounded-sm bg-muted/40">
              {shotUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shotUrl}
                  alt={pick.title}
                  className="h-full w-full object-cover object-top transition-transform group-hover:scale-[1.02]"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = "none"
                  }}
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[12px] font-medium">
                {pick.title}
              </div>
              {pick.why ? (
                <div className="line-clamp-2 text-[11px] text-muted-foreground">
                  {pick.why}
                </div>
              ) : null}
            </div>
          </a>
        )
      })}
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
        <AiMarkdown className="font-semibold text-[14px] [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
          {tagline}
        </AiMarkdown>
      ) : null}

      {summary ? (
        <div>
          <div className="text-muted-foreground mb-1 text-[11px] uppercase tracking-wide">
            Summary
          </div>
          <AiMarkdown>{summary}</AiMarkdown>
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
                    <div className="mt-1">
                      <AiMarkdown className="text-[12.5px] [&_*]:leading-relaxed [&_pre]:my-2">
                        {sub}
                      </AiMarkdown>
                    </div>
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
