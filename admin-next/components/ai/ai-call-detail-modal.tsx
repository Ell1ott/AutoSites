"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { api, type AiCallDetail } from "@/lib/api"

type Props = {
  logId: number | null
  onClose: () => void
}

export function AiCallDetailModal({ logId, onClose }: Props): React.JSX.Element {
  const open = logId !== null
  const { data, isLoading, error } = useQuery<AiCallDetail>({
    enabled: open,
    queryKey: ["ai-call", logId],
    queryFn: () => api.aiCall(logId as number),
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>AI call</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            Loading…
          </div>
        ) : error ? (
          <div className="text-destructive py-8 text-center text-sm">
            Failed to load: {(error as Error).message}
          </div>
        ) : data ? (
          <div className="flex max-h-[75vh] flex-col gap-4 overflow-auto pr-1">
            <MetaGrid d={data} />
            {(() => {
              const { system, user } = splitPrompt(data.prompt_text ?? "")
              if (system === null && user === null) {
                return (
                  <Section
                    title="Prompt"
                    text={data.prompt_text ?? ""}
                    monospace
                  />
                )
              }
              return (
                <>
                  <Section
                    title="System prompt"
                    text={system ?? ""}
                    monospace
                  />
                  <Section
                    title="User message (documents)"
                    text={user ?? ""}
                    monospace
                  />
                </>
              )
            })()}
            {data.image_b64 ? (
              <div>
                <div className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                  Screenshot sent to model
                </div>
                <img
                  alt="screenshot sent to model"
                  src={`data:image/png;base64,${data.image_b64}`}
                  className="max-h-[400px] rounded border"
                />
              </div>
            ) : null}
            <Section
              title="Raw response"
              text={data.raw_response ?? ""}
              monospace
            />
            <Section
              title="Parsed value"
              text={
                typeof data.value === "string"
                  ? data.value
                  : JSON.stringify(data.value, null, 2)
              }
              monospace
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

// The runtime stores the prompt as "[SYSTEM]\n…\n\n[USER]\n…". Split it back
// into its two parts for display; fall back to a single block for older rows
// (or any value) that don't carry the markers.
function splitPrompt(text: string): {
  system: string | null
  user: string | null
} {
  const m = /^\[SYSTEM\]\n([\s\S]*?)\n\n\[USER\]\n([\s\S]*)$/.exec(text)
  if (!m) return { system: null, user: null }
  return { system: m[1], user: m[2] }
}

function MetaGrid({ d }: { d: AiCallDetail }): React.JSX.Element {
  const fields: Array<[string, string]> = [
    ["Task", d.task],
    ["Place", d.place_id],
    ["Provider", d.provider ?? "—"],
    ["Model", d.model ?? "—"],
    ["Duration", d.duration_ms != null ? `${d.duration_ms} ms` : "—"],
    ["Created", d.created_at],
  ]
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
      {fields.map(([k, v]) => (
        <div key={k}>
          <span className="text-muted-foreground">{k}: </span>
          <span className="font-mono">{v}</span>
        </div>
      ))}
    </div>
  )
}

function Section({
  title,
  text,
  monospace,
}: {
  title: string
  text: string
  monospace?: boolean
}): React.JSX.Element {
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* swallow */
    }
  }
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {title}
        </div>
        <Button type="button" size="xs" variant="ghost" onClick={copy}>
          Copy
        </Button>
      </div>
      <pre
        className={
          (monospace ? "font-mono " : "") +
          "max-h-[260px] overflow-auto whitespace-pre-wrap rounded border bg-muted/30 p-2 text-[12px] leading-snug"
        }
      >
        {text || <span className="text-muted-foreground italic">empty</span>}
      </pre>
    </div>
  )
}
