"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  Call02Icon,
  Image01Icon,
  Link04Icon,
  MapsLocation01Icon,
  Loading03Icon,
  StarIcon,
} from "@hugeicons/core-free-icons"

import { AiExperimenter } from "@/components/ai/ai-experimenter"
import { AiOutputCard } from "@/components/ai/ai-output-card"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useFields } from "@/hooks/use-fields"
import { useLeadDetail } from "@/hooks/use-lead-detail"
import { api } from "@/lib/api"
import { getScreenshotUrl } from "@/lib/leads"
import {
  FIELD_FORMAT_STARS_1_10,
  type AiTask,
  type FieldDescriptor,
  type Lead,
} from "@/lib/types"
import { cn } from "@/lib/utils"

import { RatingEditor } from "./rating-editor"

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type Props = { placeId: string }

// Top-level columns / dynamic keys already rendered prominently somewhere
// in this layout — skip them in the generic key/value list.
const SKIP_KEYS = new Set<string>([
  "place_id",
  "name",
  "lead_score",
  "updated_at",
  "screenshot_path",
  "crawl_pages",
])

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function LeadDetail({ placeId }: Props): React.JSX.Element {
  const router = useRouter()
  const qc = useQueryClient()
  const leadQuery = useLeadDetail(placeId)
  const tasksQuery = useQuery<AiTask[]>({
    queryKey: ["ai-tasks"],
    queryFn: () => api.aiTasks(),
    staleTime: 60_000,
  })
  const { fields } = useFields()

  if (leadQuery.isPending) return <LeadDetailSkeleton />
  if (leadQuery.isError || !leadQuery.data) {
    return (
      <ErrorState
        message={
          leadQuery.error instanceof Error
            ? leadQuery.error.message
            : "Couldn't load lead."
        }
        onRetry={() =>
          qc.invalidateQueries({ queryKey: ["lead", placeId] })
        }
      />
    )
  }

  const lead = leadQuery.data
  const tasks = tasksQuery.data ?? []

  return (
    <div className="mx-auto w-full max-w-[1280px]">
      <Header lead={lead} onClose={() => router.back()} />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)]">
        {/* Column 1 — General data */}
        <section className="min-w-0">
          <GeneralData lead={lead} fields={fields} />
        </section>

        {/* Column 2 — AI outputs */}
        <section className="min-w-0">
          <AiOutputsColumn lead={lead} tasks={tasks} />
        </section>

        {/* Column 3 — AI experimentation (sticky) */}
        <section className="min-w-0">
          <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-muted-foreground mb-3 text-[11px] uppercase tracking-wide">
                Experiment
              </div>
              <AiExperimenter
                mode="single"
                targetIds={[placeId]}
                allowPromptEdit
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Header
// -----------------------------------------------------------------------------

function getPhone(lead: Lead): string | null {
  const candidates = [
    lead.dynamic?.phone,
    lead.dynamic?.formatted_phone_number,
    lead.dynamic?.international_phone_number,
    lead.dynamic?.phone_number,
  ]
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c
  }
  return null
}

function getAddress(lead: Lead): string | null {
  const candidates = [
    lead.dynamic?.formatted_address,
    lead.dynamic?.address,
    lead.dynamic?.vicinity,
  ]
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c
  }
  return null
}

function getMapsUrl(lead: Lead): string {
  const explicit = lead.dynamic?.google_maps_url
  if (typeof explicit === "string" && explicit.trim()) return explicit
  const addr = getAddress(lead)
  const q = addr ?? lead.name
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

function getCategory(lead: Lead): string | null {
  const types = lead.dynamic?.types
  if (Array.isArray(types) && types.length > 0) {
    return String(types[0]).replace(/_/g, " ")
  }
  const single = lead.dynamic?.category ?? lead.dynamic?.primary_category
  if (typeof single === "string" && single.trim()) return single
  return null
}

function Header({
  lead,
  onClose,
}: {
  lead: Lead
  onClose: () => void
}): React.JSX.Element {
  const phone = getPhone(lead)
  const mapsUrl = getMapsUrl(lead)
  const category = getCategory(lead)

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold leading-tight">{lead.name}</h1>
        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 text-sm">
          {category ? <span>{category}</span> : null}
          {category && lead.business_status ? (
            <span className="opacity-50">·</span>
          ) : null}
          {lead.business_status ? (
            <span
              className={cn(
                lead.business_status !== "OPERATIONAL" && "text-destructive",
              )}
            >
              {lead.business_status}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              asChild
            >
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open in Maps"
              >
                <HugeiconsIcon
                  icon={MapsLocation01Icon}
                  size={16}
                  strokeWidth={1.75}
                />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open in Maps</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={!lead.website}
                asChild={!!lead.website}
              >
                {lead.website ? (
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Visit website"
                  >
                    <HugeiconsIcon
                      icon={Link04Icon}
                      size={16}
                      strokeWidth={1.75}
                    />
                  </a>
                ) : (
                  <HugeiconsIcon
                    icon={Link04Icon}
                    size={16}
                    strokeWidth={1.75}
                  />
                )}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {lead.website ? "Visit website" : "No website"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={!phone}
                asChild={!!phone}
              >
                {phone ? (
                  <a href={`tel:${phone}`} aria-label={`Call ${phone}`}>
                    <HugeiconsIcon
                      icon={Call02Icon}
                      size={16}
                      strokeWidth={1.75}
                    />
                  </a>
                ) : (
                  <HugeiconsIcon
                    icon={Call02Icon}
                    size={16}
                    strokeWidth={1.75}
                  />
                )}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{phone ?? "No phone"}</TooltipContent>
        </Tooltip>

        <div className="ml-2">
          <RatingEditor placeId={lead.place_id} value={lead.lead_score} />
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.75} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Close</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Column 1 — General data
// -----------------------------------------------------------------------------

function GeneralData({
  lead,
  fields,
}: {
  lead: Lead
  fields: FieldDescriptor[]
}): React.JSX.Element {
  const screenshotUrl = getScreenshotUrl(lead)
  const [shotFailed, setShotFailed] = useState(false)
  const crawlPages = Array.isArray(lead.dynamic?.crawl_pages)
    ? (lead.dynamic.crawl_pages as unknown[])
    : null

  // Build a set of present keys: top-level columns + every dynamic.* key.
  const rows = useMemo(() => {
    const out: Array<{ key: string; value: unknown; meta?: FieldDescriptor }> =
      []
    const lookup = new Map<string, FieldDescriptor>()
    for (const f of fields) {
      const k = f.source === "dynamic" ? `dynamic.${f.key}` : f.key
      lookup.set(k, f)
    }

    // Top-level slim columns (excluding skip set).
    const slimCols: Array<keyof Lead> = [
      "rating",
      "review_count",
      "website",
      "business_status",
    ]
    for (const k of slimCols) {
      if (SKIP_KEYS.has(k as string)) continue
      const v = (lead as unknown as Record<string, unknown>)[k as string]
      if (v == null || v === "") continue
      out.push({ key: k as string, value: v, meta: lookup.get(k as string) })
    }

    // Dynamic keys.
    const dyn = lead.dynamic ?? {}
    for (const [k, v] of Object.entries(dyn)) {
      if (SKIP_KEYS.has(k)) continue
      if (v == null || v === "") continue
      out.push({
        key: k,
        value: v,
        meta: lookup.get(`dynamic.${k}`),
      })
    }
    return out
  }, [lead, fields])

  return (
    <div className="flex flex-col gap-4">
      {/* Screenshot hero */}
      <div className="relative">
        {screenshotUrl && !shotFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={screenshotUrl}
            alt={`${lead.name} screenshot`}
            onError={() => setShotFailed(true)}
            className="aspect-[16/10] w-full cursor-zoom-in rounded-md border bg-muted/30 object-cover object-top"
            // TODO: clicking should open a lightbox; deferred for v1.
          />
        ) : (
          <div className="text-muted-foreground flex aspect-[16/10] w-full items-center justify-center rounded-md border bg-muted/30">
            <HugeiconsIcon
              icon={Image01Icon}
              size={20}
              strokeWidth={1.25}
              className="opacity-40"
            />
            <span className="ml-2 text-[12px]">No screenshot</span>
          </div>
        )}
      </div>

      {/* Crawl-page thumbnail strip */}
      {crawlPages && crawlPages.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto">
          {crawlPages.map((page, i) => {
            const p =
              typeof page === "object" && page !== null
                ? (page as { screenshot_path?: unknown; url?: unknown })
                : null
            const path =
              typeof p?.screenshot_path === "string" ? p.screenshot_path : null
            const base = process.env.NEXT_PUBLIC_PI_URL?.replace(/\/+$/, "")
            const url =
              path && base
                ? `${base}/screenshots/${encodeURIComponent(path)}`
                : null
            return (
              <div
                key={i}
                className="aspect-[16/10] h-16 shrink-0 cursor-pointer overflow-hidden rounded border bg-muted/30"
                title={typeof p?.url === "string" ? p.url : undefined}
                // TODO: clicking should open a lightbox; deferred for v1.
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover object-top"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = "none"
                    }}
                  />
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Key/value list */}
      <dl className="flex flex-col gap-3">
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No additional fields.</p>
        ) : (
          rows.map(({ key, value, meta }) => (
            <KeyValueRow
              key={key}
              label={meta?.display ?? prettyKey(key)}
              value={value}
              format={meta?.format}
            />
          ))
        )}
      </dl>
    </div>
  )
}

function prettyKey(k: string): string {
  return k
    .replace(/_/g, " ")
    .replace(/\bid\b/i, "ID")
    .replace(/\burl\b/i, "URL")
    .replace(/^./, (c) => c.toUpperCase())
}

// -----------------------------------------------------------------------------
// KeyValueRow
// -----------------------------------------------------------------------------

function KeyValueRow({
  label,
  value,
  format,
}: {
  label: string
  value: unknown
  format?: string
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1 border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-muted-foreground text-[11px] uppercase tracking-wide">
        {label}
      </dt>
      <dd className="text-[13px]">
        <ValueRenderer value={value} format={format} />
      </dd>
    </div>
  )
}

function ValueRenderer({
  value,
  format,
}: {
  value: unknown
  format?: string
}): React.JSX.Element {
  // Format hooks first.
  if (format === FIELD_FORMAT_STARS_1_10 && typeof value === "number") {
    return (
      <span className="inline-flex items-center gap-1">
        <span>{value}</span>
        <HugeiconsIcon icon={StarIcon} size={12} strokeWidth={1.75} />
      </span>
    )
  }

  if (typeof value === "boolean") {
    return (
      <span className={value ? "text-emerald-500" : "text-muted-foreground"}>
        {value ? "Yes" : "No"}
      </span>
    )
  }

  if (typeof value === "number") {
    return <span>{value}</span>
  }

  if (typeof value === "string") {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline-offset-2 hover:underline break-all"
        >
          {value}
        </a>
      )
    }
    return <LongString value={value} />
  }

  if (Array.isArray(value)) {
    const isShort = value.length <= 6 && value.every((v) => typeof v !== "object")
    if (isShort) {
      return <span>{value.map((v) => String(v)).join(", ")}</span>
    }
    return (
      <details className="text-[12.5px]">
        <summary className="text-muted-foreground cursor-pointer">
          {value.length} item{value.length === 1 ? "" : "s"}
        </summary>
        <pre className="bg-muted/30 mt-1 max-h-64 overflow-auto rounded-md p-2 font-mono text-[11.5px]">
          {safeStringify(value)}
        </pre>
      </details>
    )
  }

  if (value && typeof value === "object") {
    return (
      <details className="text-[12.5px]">
        <summary className="text-muted-foreground cursor-pointer">Object</summary>
        <pre className="bg-muted/30 mt-1 max-h-64 overflow-auto rounded-md p-2 font-mono text-[11.5px]">
          {safeStringify(value)}
        </pre>
      </details>
    )
  }

  if (value == null) {
    return <span className="text-muted-foreground italic">—</span>
  }

  return <span>{String(value)}</span>
}

function LongString({ value }: { value: string }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const isLong = value.length > 240 || value.split("\n").length > 4
  if (!isLong) {
    return <p className="whitespace-pre-wrap">{value}</p>
  }
  return (
    <div>
      <p
        className={cn("whitespace-pre-wrap", !open && "line-clamp-3")}
      >
        {value}
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground mt-1 text-[11px] underline-offset-2 hover:underline"
      >
        {open ? "Show less" : "Show more"}
      </button>
    </div>
  )
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

// -----------------------------------------------------------------------------
// Column 2 — AI outputs
// -----------------------------------------------------------------------------

function AiOutputsColumn({
  lead,
  tasks,
}: {
  lead: Lead
  tasks: AiTask[]
}): React.JSX.Element {
  const qc = useQueryClient()
  const rerunMut = useMutation({
    mutationFn: async (task: AiTask) =>
      api.startJob("ai_task", {
        task: task.name,
        place_ids: [lead.place_id],
      }),
    onSuccess: () => {
      // Backend SSE will update fields later — invalidate to refetch soon.
      qc.invalidateQueries({ queryKey: ["lead", lead.place_id] })
    },
  })

  if (tasks.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No AI tasks defined.</p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {tasks.map((task) => {
        const field =
          (task.config.output_field as string | undefined) ?? task.name
        const output = (lead.dynamic as Record<string, unknown> | undefined)?.[
          field
        ]
        const isRerunning =
          rerunMut.isPending && rerunMut.variables?.name === task.name
        return (
          <div key={task.name} className="relative">
            <AiOutputCard
              task={task}
              output={output}
              onRerun={() => rerunMut.mutate(task)}
            />
            {isRerunning ? (
              <div className="bg-background/60 absolute inset-0 flex items-center justify-center rounded-lg">
                <HugeiconsIcon
                  icon={Loading03Icon}
                  size={16}
                  className="animate-spin"
                />
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Loading / error states
// -----------------------------------------------------------------------------

function LeadDetailSkeleton(): React.JSX.Element {
  return (
    <div className="mx-auto w-full max-w-[1280px] animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-56 rounded bg-muted/50" />
          <div className="h-3 w-32 rounded bg-muted/40" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-8 rounded-full bg-muted/40" />
          <div className="h-8 w-8 rounded-full bg-muted/40" />
          <div className="h-8 w-8 rounded-full bg-muted/40" />
          <div className="h-8 w-14 rounded-full bg-muted/40" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="aspect-[16/10] w-full rounded-md bg-muted/40" />
            <div className="h-3 w-3/4 rounded bg-muted/40" />
            <div className="h-3 w-2/3 rounded bg-muted/40" />
            <div className="h-3 w-1/2 rounded bg-muted/40" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}): React.JSX.Element {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg border bg-card p-6 text-center">
      <p className="text-[13px]">Couldn&apos;t load lead.</p>
      <p className="text-muted-foreground text-[12px]">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}
