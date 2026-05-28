"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowExpand02Icon,
  Loading03Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/api"
import { getPiBackendBase } from "@/lib/pi-url"
import { useEventStream } from "@/lib/sse"
import { useTrackJob } from "@/lib/store/job-toaster"
import type { AiTask, InspirationPick, JobEvent, Lead } from "@/lib/types"
import { cn } from "@/lib/utils"

const INSPIRATION_QUERIES_TASK = "generate_inspiration_queries"
const FIND_INSPIRATION_TASK = "find_inspiration"
const INSPIRATION_QUERIES_FIELD = "inspiration_queries"
const DESIGN_INSPIRATIONS_FIELD = "design_inspirations"

type Gallery = {
  id: string
  name: string
  url_template: string
}

type Props = {
  lead: Lead
  tasks: AiTask[]
}

export function InspirationTab({ lead, tasks }: Props): React.JSX.Element {
  const queriesTask = tasks.find((t) => t.name === INSPIRATION_QUERIES_TASK)
  const findTask = tasks.find((t) => t.name === FIND_INSPIRATION_TASK)
  const galleries = useMemo<Gallery[]>(() => {
    const raw = (queriesTask?.config.galleries as unknown) ?? []
    if (!Array.isArray(raw)) return []
    return raw
      .filter(
        (g): g is Gallery =>
          typeof g === "object" &&
          g !== null &&
          typeof (g as Gallery).id === "string" &&
          typeof (g as Gallery).name === "string" &&
          typeof (g as Gallery).url_template === "string",
      )
      .map((g) => ({ id: g.id, name: g.name, url_template: g.url_template }))
  }, [queriesTask])

  const queries =
    (lead.dynamic?.[INSPIRATION_QUERIES_FIELD] as Record<string, string> | undefined) ?? {}

  const gatheredRaw = lead.dynamic?.[DESIGN_INSPIRATIONS_FIELD]
  const gathered: InspirationPick[] = Array.isArray(gatheredRaw)
    ? (gatheredRaw as InspirationPick[]).filter(
        (p) =>
          typeof p === "object" &&
          p !== null &&
          typeof p.url === "string" &&
          typeof p.title === "string",
      )
    : []

  return (
    <Tabs defaultValue="browsing" className="mt-0">
      <TabsList variant="line" className="mb-4">
        <TabsTrigger value="browsing">Browsing</TabsTrigger>
        <TabsTrigger value="gathered">
          Gathered{gathered.length > 0 ? ` (${gathered.length})` : ""}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="browsing" className="mt-0">
        <BrowsingMode
          placeId={lead.place_id}
          leadName={lead.name}
          galleries={galleries}
          queries={queries}
          hasQueriesTask={!!queriesTask}
        />
      </TabsContent>

      <TabsContent value="gathered" className="mt-0">
        <GatheredMode
          picks={gathered}
          placeId={lead.place_id}
          leadName={lead.name}
          findTaskName={findTask?.name ?? null}
          findTaskLabel={findTask?.label ?? FIND_INSPIRATION_TASK}
        />
      </TabsContent>
    </Tabs>
  )
}

// -----------------------------------------------------------------------------
// Browsing mode
// -----------------------------------------------------------------------------

function renderUrl(template: string, query: string): string {
  return template.replace(/\{\{\s*query\s*\}\}/g, encodeURIComponent(query))
}

function BrowsingMode({
  placeId,
  leadName,
  galleries,
  queries,
  hasQueriesTask,
}: {
  placeId: string
  leadName: string
  galleries: Gallery[]
  queries: Record<string, string>
  hasQueriesTask: boolean
}): React.JSX.Element {
  const qc = useQueryClient()
  const trackJob = useTrackJob()
  const [pendingJobId, setPendingJobId] = useState<string | null>(null)
  const generateMut = useMutation({
    mutationFn: async () =>
      api.startJob(INSPIRATION_QUERIES_TASK, { place_ids: [placeId] }),
    onSuccess: (res) => {
      setPendingJobId(res.id)
      trackJob(res.id, {
        title: `Inspiration queries · ${leadName}`,
        kind: INSPIRATION_QUERIES_TASK,
      })
    },
  })

  // Watch the pending job's SSE stream so we can invalidate the lead query the
  // moment the job finishes (otherwise the user sits on "Generate now" until
  // they manually refocus the window).
  useEventStream<JobEvent>(!!pendingJobId, {
    url: pendingJobId ? `/jobs/${encodeURIComponent(pendingJobId)}/stream` : "",
    storageKey: pendingJobId ? `inspiration-queries:${pendingJobId}` : "",
    onEvent: (e) => {
      if (
        e.event === "finished" ||
        e.event === "cancelled" ||
        e.event === "error"
      ) {
        qc.invalidateQueries({ queryKey: ["lead", placeId] })
        setPendingJobId(null)
      }
    },
  })

  if (!hasQueriesTask) {
    return (
      <EmptyState
        title="No inspiration-queries task configured."
        body={
          <>
            Seed it from the backend with{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
              uv run python -m scripts.seed_inspiration_queries_task
            </code>
            .
          </>
        }
      />
    )
  }

  if (galleries.length === 0) {
    return (
      <EmptyState
        title="No galleries configured."
        body="Add gallery entries to the generate_inspiration_queries task's config.galleries array."
      />
    )
  }

  const galleriesWithQueries = galleries
    .map((g) => ({ ...g, query: queries[g.id] }))
    .filter((g) => typeof g.query === "string" && g.query.length > 0)

  if (galleriesWithQueries.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <HugeiconsIcon
            icon={SparklesIcon}
            size={18}
            strokeWidth={1.75}
            className="text-muted-foreground"
          />
        </div>
        <h3 className="text-base font-medium">No inspiration queries yet</h3>
        <p className="text-muted-foreground mx-auto mt-1 max-w-md text-[13px]">
          Generate AI search queries tuned to this lead, then browse Dribbble,
          Awwwards and Pinterest in-app.
        </p>
        <Button
          type="button"
          size="sm"
          className="mt-4"
          disabled={generateMut.isPending || !!pendingJobId}
          onClick={() => generateMut.mutate()}
        >
          {generateMut.isPending || pendingJobId ? (
            <>
              <HugeiconsIcon
                icon={Loading03Icon}
                size={14}
                className="mr-1.5 animate-spin"
              />
              {generateMut.isPending ? "Starting…" : "Generating…"}
            </>
          ) : (
            "Generate now"
          )}
        </Button>
        {generateMut.isError ? (
          <p className="text-destructive mt-3 text-[12px]">
            {generateMut.error instanceof Error
              ? generateMut.error.message
              : "Failed to start job."}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <GalleryBrowser
      galleries={galleriesWithQueries}
      onRegenerate={() => generateMut.mutate()}
      regenerating={generateMut.isPending || !!pendingJobId}
    />
  )
}

type GalleryWithQuery = Gallery & { query: string }

function GalleryBrowser({
  galleries,
  onRegenerate,
  regenerating,
}: {
  galleries: GalleryWithQuery[]
  onRegenerate: () => void
  regenerating: boolean
}): React.JSX.Element {
  const first = galleries[0]?.id ?? ""
  const [active, setActive] = useState(first)

  const openAll = () => {
    for (const g of galleries) {
      window.open(renderUrl(g.url_template, g.query), "_blank", "noopener,noreferrer")
    }
  }

  return (
    <Tabs
      orientation="vertical"
      value={active}
      onValueChange={setActive}
      className="min-h-[600px]"
    >
      <aside className="flex flex-col gap-3">
        <TabsList variant="line" className="items-stretch">
          {galleries.map((g) => (
            <TabsTrigger
              key={g.id}
              value={g.id}
              className="flex items-center justify-between gap-2"
              title={g.query}
            >
              <span className="truncate text-left">{g.name}</span>
              <a
                href={renderUrl(g.url_template, g.query)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground hover:text-foreground rounded p-0.5"
                aria-label={`Open ${g.name} externally`}
                data-icon="inline-end"
              >
                <HugeiconsIcon
                  icon={ArrowExpand02Icon}
                  size={12}
                  strokeWidth={1.75}
                />
              </a>
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="flex flex-col gap-1.5">
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={openAll}
            className="justify-start"
          >
            Open all in new tabs
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={onRegenerate}
            disabled={regenerating}
            className="justify-start"
          >
            {regenerating ? "Regenerating…" : "Regenerate queries"}
          </Button>
        </div>
      </aside>

      {galleries.map((g) => (
        <TabsContent key={g.id} value={g.id} className="mt-0">
          <GalleryFrame gallery={g} />
        </TabsContent>
      ))}
    </Tabs>
  )
}

function GalleryFrame({
  gallery,
}: {
  gallery: GalleryWithQuery
}): React.JSX.Element {
  const url = renderUrl(gallery.url_template, gallery.query)
  // Many design galleries (Dribbble, Pinterest, Awwwards) refuse to embed in
  // iframes via X-Frame-Options or CSP frame-ancestors. We render the iframe
  // anyway so galleries that DO allow embedding work, and surface the open-
  // external fallback prominently for the ones that don't.
  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col gap-2 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[12px] font-medium">{gallery.name}</span>
          <span className="text-muted-foreground truncate text-[12px]">
            “{gallery.query}”
          </span>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 text-[12px]"
        >
          Open
          <HugeiconsIcon
            icon={ArrowExpand02Icon}
            size={12}
            strokeWidth={1.75}
          />
        </a>
      </div>
      <iframe
        // key forces a re-mount when the URL changes so we don't accumulate
        // stale history inside the iframe across gallery switches.
        key={url}
        src={url}
        title={gallery.name}
        className="flex-1 w-full rounded-md border bg-background"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <p className="text-muted-foreground text-[11px]">
        If the preview is blank, the gallery blocks iframe embedding — use
        “Open” above to view it in a new tab.
      </p>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Gathered mode
// -----------------------------------------------------------------------------

function GatheredMode({
  picks,
  placeId,
  leadName,
  findTaskName,
  findTaskLabel,
}: {
  picks: InspirationPick[]
  placeId: string
  leadName: string
  findTaskName: string | null
  findTaskLabel: string
}): React.JSX.Element {
  const qc = useQueryClient()
  const trackJob = useTrackJob()
  const [pendingJobId, setPendingJobId] = useState<string | null>(null)
  const findMut = useMutation({
    mutationFn: async () => {
      if (!findTaskName) throw new Error("find_inspiration task not configured")
      return api.startJob("find_inspiration", {
        task: findTaskName,
        place_ids: [placeId],
      })
    },
    onSuccess: (res) => {
      setPendingJobId(res.id)
      trackJob(res.id, {
        title: `${findTaskLabel} · ${leadName}`,
        kind: "find_inspiration",
      })
    },
  })

  useEventStream<JobEvent>(!!pendingJobId, {
    url: pendingJobId ? `/jobs/${encodeURIComponent(pendingJobId)}/stream` : "",
    storageKey: pendingJobId ? `find-inspiration:${pendingJobId}` : "",
    onEvent: (e) => {
      if (
        e.event === "finished" ||
        e.event === "cancelled" ||
        e.event === "error"
      ) {
        qc.invalidateQueries({ queryKey: ["lead", placeId] })
        setPendingJobId(null)
      }
    },
  })

  const running = findMut.isPending || !!pendingJobId

  if (picks.length === 0) {
    if (!findTaskName) {
      return (
        <EmptyState
          title="No gathered inspiration yet."
          body={
            <>
              No <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">find_inspiration</code>{" "}
              task configured. Seed it with{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                uv run python -m scripts.seed_inspiration_task
              </code>
              .
            </>
          }
        />
      )
    }
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <HugeiconsIcon
            icon={SparklesIcon}
            size={18}
            strokeWidth={1.75}
            className="text-muted-foreground"
          />
        </div>
        <h3 className="text-base font-medium">No gathered inspiration yet</h3>
        <p className="text-muted-foreground mx-auto mt-1 max-w-md text-[13px]">
          Run the find_inspiration task to collect screenshots via the
          browser-use agent.
        </p>
        <Button
          type="button"
          size="sm"
          className="mt-4"
          disabled={running}
          onClick={() => findMut.mutate()}
        >
          {running ? (
            <>
              <HugeiconsIcon
                icon={Loading03Icon}
                size={14}
                className="mr-1.5 animate-spin"
              />
              {findMut.isPending ? "Starting…" : "Running…"}
            </>
          ) : (
            "Run find_inspiration"
          )}
        </Button>
        {findMut.isError ? (
          <p className="text-destructive mt-3 text-[12px]">
            {findMut.error instanceof Error
              ? findMut.error.message
              : "Failed to start job."}
          </p>
        ) : null}
      </div>
    )
  }
  const base = getPiBackendBase()
  return (
    <div className="flex flex-col gap-3">
      {findTaskName ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground text-[12px]">
            {picks.length} screenshot{picks.length === 1 ? "" : "s"} gathered
          </p>
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={running}
            onClick={() => findMut.mutate()}
          >
            {running ? (
              <>
                <HugeiconsIcon
                  icon={Loading03Icon}
                  size={12}
                  className="mr-1.5 animate-spin"
                />
                {findMut.isPending ? "Starting…" : "Running…"}
              </>
            ) : (
              "Find more"
            )}
          </Button>
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
            className={cn(
              "group flex flex-col gap-2 rounded-lg border bg-card p-2",
              "transition-colors hover:bg-muted/40",
            )}
            title={pick.why ?? pick.title}
          >
            <div className="aspect-[16/10] w-full overflow-hidden rounded-md bg-muted/40">
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
            <div className="min-w-0 px-1">
              <div className="truncate text-[13px] font-medium">
                {pick.title}
              </div>
              {pick.why ? (
                <div className="line-clamp-2 text-[12px] text-muted-foreground">
                  {pick.why}
                </div>
              ) : null}
            </div>
          </a>
        )
      })}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Empty state
// -----------------------------------------------------------------------------

function EmptyState({
  title,
  body,
}: {
  title: string
  body: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="rounded-lg border bg-card p-8 text-center">
      <h3 className="text-base font-medium">{title}</h3>
      <p className="text-muted-foreground mx-auto mt-1 max-w-md text-[13px]">
        {body}
      </p>
    </div>
  )
}
