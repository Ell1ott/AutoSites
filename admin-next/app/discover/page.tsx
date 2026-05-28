"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Delete02Icon, PlayIcon } from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { JobDrawer } from "@/components/queue/job-drawer"
import { formatRelativeTime } from "@/components/queue/relative-time"
import { DiscoverResultsPanel } from "@/components/discover/discover-results-panel"
import {
  buildDiscoverMapLeads,
  collectFetchLeadRefsFromEvents,
  formatRadiusMeters,
} from "@/lib/discover-map-leads"
import { useQueriesStore, newQueryId, type SavedQuery } from "@/lib/store/queries"
import { useTrackJob } from "@/lib/store/job-toaster"
import { api } from "@/lib/api"
import { useEventStream } from "@/lib/sse"
import type { JobEvent } from "@/lib/types"
import { cn } from "@/lib/utils"
import type { DiscoverMapHandle } from "@/components/discover/discover-map"

const DiscoverMap = dynamic(
  () =>
    import("@/components/discover/discover-map").then((m) => ({
      default: m.DiscoverMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/30 flex h-full min-h-[280px] w-full items-center justify-center">
        <span className="text-muted-foreground text-[12px]">Loading map…</span>
      </div>
    ),
  },
)

const DEFAULT_QUERY: Omit<SavedQuery, "id"> = {
  name: "",
  text_query: "businesses",
  lat: 55.6761,
  lng: 12.5683,
  radius_m: 25_000,
  count: 10,
  region_code: "DK",
  language_code: "da",
  rank_by_distance: true,
}

export default function DiscoverPage() {
  const queries = useQueriesStore((s) => s.queries)
  const upsert = useQueriesStore((s) => s.upsert)
  const remove = useQueriesStore((s) => s.remove)
  const recordRun = useQueriesStore((s) => s.recordRun)
  const trackJob = useTrackJob()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Omit<SavedQuery, "id">>(DEFAULT_QUERY)
  const [openJobId, setOpenJobId] = useState<string | null>(null)
  const [liveJobId, setLiveJobId] = useState<string | null>(null)
  const [liveEvents, setLiveEvents] = useState<JobEvent[]>([])
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const qc = useQueryClient()
  const mapRef = useRef<DiscoverMapHandle>(null)
  const draftRef = useRef(draft)
  draftRef.current = draft

  const selected = useMemo(
    () => queries.find((q) => q.id === selectedId) ?? null,
    [queries, selectedId],
  )

  // Only load draft from store when switching saved queries — not when the
  // same query is updated after a run (which would wipe unsaved map moves).
  const prevSelectedIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (selectedId === prevSelectedIdRef.current) return
    prevSelectedIdRef.current = selectedId

    if (!selectedId) {
      setDraft(DEFAULT_QUERY)
      return
    }

    const q = queries.find((item) => item.id === selectedId)
    if (!q) return
    const { id: _id, last_run_at: _lr, last_job_id: _lj, ...rest } = q
    setDraft(rest)
  }, [selectedId, queries])

  const resultsJobId = liveJobId ?? selected?.last_job_id ?? null

  const jobSnapshot = useQuery({
    queryKey: ["jobs", resultsJobId],
    queryFn: () => api.job(resultsJobId!),
    enabled: !!resultsJobId,
    refetchInterval: (q) => {
      const status = q.state.data?.status
      return status === "running" || status === "queued" ? 2000 : false
    },
  })

  const mergedEvents = useMemo(() => {
    const fromStream = liveEvents
    const fromSnapshot = jobSnapshot.data?.last_events ?? []
    if (fromStream.length === 0) return fromSnapshot
    if (fromSnapshot.length === 0) return fromStream

    const bySeq = new Map<number, JobEvent>()
    for (const e of [...fromSnapshot, ...fromStream]) {
      bySeq.set(e.seq, e)
    }
    return Array.from(bySeq.values()).sort((a, b) => a.seq - b.seq)
  }, [liveEvents, jobSnapshot.data?.last_events])

  const resultRefs = useMemo(
    () => collectFetchLeadRefsFromEvents(mergedEvents),
    [mergedEvents],
  )

  const placeIds = useMemo(
    () => resultRefs.map((r) => r.placeId),
    [resultRefs],
  )

  const leadsForCoords = useQuery({
    queryKey: ["discover-leads", placeIds],
    queryFn: () =>
      api.leads({
        filters: [{ key: "place_id", op: "in", value: placeIds }],
        limit: Math.min(Math.max(placeIds.length, 1), 500),
      }),
    enabled: placeIds.length > 0,
  })

  const mapLeads = useMemo(
    () => buildDiscoverMapLeads(resultRefs, leadsForCoords.data?.items ?? []),
    [resultRefs, leadsForCoords.data?.items],
  )

  const resultsForPanel = useMemo(() => {
    const coordsById = new Map(mapLeads.map((l) => [l.placeId, l]))
    return resultRefs.map((ref) => {
      const mapped = coordsById.get(ref.placeId)
      return {
        ...ref,
        lat: ref.lat ?? mapped?.lat,
        lng: ref.lng ?? mapped?.lng,
      }
    })
  }, [resultRefs, mapLeads])

  const liveRun = useMemo(() => {
    if (!liveJobId) return null
    let done = 0
    let total = 0
    let status: "running" | "done" | "failed" | "cancelled" = "running"

    const statusFromJob = jobSnapshot.data?.status
    if (statusFromJob === "done") status = "done"
    else if (statusFromJob === "failed") status = "failed"
    else if (statusFromJob === "cancelled") status = "cancelled"

    for (const e of mergedEvents) {
      if (e.event === "progress") {
        const d = e.data as { done?: number; total?: number }
        if (typeof d.done === "number") done = d.done
        if (typeof d.total === "number") total = d.total
      } else if (e.event === "finished") status = "done"
      else if (e.event === "cancelled") status = "cancelled"
      else if (e.event === "error") status = "failed"
    }
    return {
      jobId: liveJobId,
      done,
      total,
      status,
      leadCount: resultRefs.length,
    }
  }, [liveJobId, mergedEvents, resultRefs.length, jobSnapshot.data?.status])

  useEventStream<JobEvent>(!!liveJobId, {
    url: liveJobId ? `/jobs/${encodeURIComponent(liveJobId)}/stream` : "",
    onEvent: useCallback((e: JobEvent) => {
      setLiveEvents((prev) => {
        if (prev.some((x) => x.seq === e.seq)) return prev
        return [...prev, e]
      })
    }, []),
  })

  function newQuery() {
    setSelectedId(null)
    setDraft(DEFAULT_QUERY)
    setSelectedLeadId(null)
  }

  function save(override?: Partial<Omit<SavedQuery, "id">>): SavedQuery {
    const id = selectedId ?? newQueryId()
    const current = { ...draftRef.current, ...override }
    const next: SavedQuery = {
      id,
      ...current,
      name: current.name.trim() || current.text_query,
      last_run_at: selected?.last_run_at,
      last_job_id: selected?.last_job_id,
    }
    upsert(next)
    setSelectedId(id)
    setDraft(current)
    return next
  }

  const run = useMutation({
    mutationFn: async () => {
      const fromMap = mapRef.current?.getSearchCenter()
      const lat = fromMap?.lat ?? draftRef.current.lat
      const lng = fromMap?.lng ?? draftRef.current.lng
      const saved = save({ lat, lng })
      const job = await api.startJob("fetch_leads", {
        query: saved.text_query,
        lat: saved.lat,
        lng: saved.lng,
        radius_m: saved.radius_m,
        count: saved.count,
        region_code: saved.region_code,
        language_code: saved.language_code,
        rank_by_distance: saved.rank_by_distance,
      })
      recordRun(saved.id, job.id)
      qc.invalidateQueries({ queryKey: ["jobs"] })
      return { job, saved }
    },
    onSuccess: ({ job, saved }) => {
      setLiveJobId(job.id)
      setLiveEvents([])
      setSelectedLeadId(null)
      qc.invalidateQueries({ queryKey: ["jobs", job.id] })
      trackJob(job.id, {
        title: `Discover · ${saved.name || saved.text_query}`,
        kind: "fetch_leads",
      })
    },
  })

  const handleCenterChange = useCallback((lat: number, lng: number) => {
    setDraft((prev) => ({ ...prev, lat, lng }))
  }, [])

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,30%)_minmax(0,70%)] divide-x divide-border">
      <aside className="flex min-h-0 flex-col overflow-y-auto">
        <div className="border-border flex shrink-0 items-center justify-between border-b px-4 py-3">
          <h2 className="text-[13px] font-semibold">Saved queries</h2>
          <Button size="xs" variant="ghost" onClick={newQuery} className="gap-1">
            <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={1.75} />
            New
          </Button>
        </div>
        {queries.length === 0 ? (
          <p className="text-muted-foreground p-4 text-center text-[12px]">
            No saved queries yet. Fill the form and click Save.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {queries.map((q) => (
              <li
                key={q.id}
                className={cn(
                  "hover:bg-accent/40 group flex cursor-pointer items-start gap-2 px-4 py-2.5",
                  selectedId === q.id && "bg-accent/60",
                )}
                onClick={() => setSelectedId(q.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-foreground truncate text-[13px] font-medium">{q.name}</div>
                  <div className="text-muted-foreground mt-0.5 truncate text-[11px]">
                    {q.text_query} · {formatRadiusMeters(q.radius_m)} · n={q.count}
                  </div>
                  {q.last_run_at && (
                    <div className="text-muted-foreground mt-0.5 text-[11px]">
                      Last run {formatRelativeTime(q.last_run_at)}
                    </div>
                  )}
                </div>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    remove(q.id)
                    if (selectedId === q.id) {
                      setSelectedId(null)
                      setDraft(DEFAULT_QUERY)
                    }
                  }}
                  aria-label="Delete query"
                  className="opacity-0 group-hover:opacity-100"
                >
                  <HugeiconsIcon icon={Delete02Icon} size={12} strokeWidth={1.75} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="flex min-h-0 flex-col">
        <div className="border-border shrink-0 border-b px-5 py-4">
          <header className="mb-3 flex items-baseline gap-3">
            <h1 className="text-[15px] font-medium">
              {selectedId ? "Edit query" : "New query"}
            </h1>
            {selected?.last_job_id && (
              <button
                type="button"
                onClick={() => setOpenJobId(selected.last_job_id!)}
                className="text-primary text-[12px] hover:underline"
              >
                View logs →
              </button>
            )}
            {liveRun && liveRun.status === "running" && (
              <span className="text-muted-foreground text-[12px]">
                Fetching
                {liveRun.total > 0
                  ? ` · ${liveRun.done}/${liveRun.total}`
                  : liveRun.leadCount > 0
                    ? ` · ${liveRun.leadCount} found`
                    : "…"}
              </span>
            )}
            {liveRun && liveRun.status !== "running" && liveRun.leadCount > 0 && (
              <span className="text-muted-foreground text-[12px]">
                {liveRun.leadCount} result{liveRun.leadCount === 1 ? "" : "s"}
              </span>
            )}
            {!liveRun && resultRefs.length > 0 && (
              <span className="text-muted-foreground text-[12px]">
                {resultRefs.length} result{resultRefs.length === 1 ? "" : "s"}
              </span>
            )}
          </header>

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] lg:items-end">
              <Field label="Name">
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Cafés in Copenhagen"
                  className="h-8"
                />
              </Field>
              <Field label="Text query">
                <Input
                  value={draft.text_query}
                  onChange={(e) => setDraft({ ...draft, text_query: e.target.value })}
                  placeholder="bakery, restaurant, etc."
                  className="h-8"
                />
              </Field>
              <Field label="Count">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={draft.count}
                  onChange={(e) => setDraft({ ...draft, count: Number(e.target.value) })}
                  className="h-8 w-24"
                />
              </Field>
              <div className="flex items-center gap-2 pb-0.5">
                <Button onClick={() => save()} variant="outline" size="sm">
                  {selectedId ? "Save" : "Save query"}
                </Button>
                <Button
                  onClick={() => run.mutate()}
                  disabled={run.isPending || !draft.text_query.trim()}
                  size="sm"
                  className="gap-1"
                >
                  <HugeiconsIcon icon={PlayIcon} size={12} strokeWidth={1.75} />
                  {run.isPending ? "Starting…" : "Run now"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
              <Field label="Region">
                <Input
                  value={draft.region_code ?? ""}
                  onChange={(e) => setDraft({ ...draft, region_code: e.target.value })}
                  placeholder="DK"
                  className="h-8"
                />
              </Field>
              <Field label="Language">
                <Input
                  value={draft.language_code ?? ""}
                  onChange={(e) => setDraft({ ...draft, language_code: e.target.value })}
                  placeholder="da"
                  className="h-8"
                />
              </Field>
              <label className="flex items-center gap-2 pb-2 text-[12px]">
                <input
                  type="checkbox"
                  checked={draft.rank_by_distance ?? true}
                  onChange={(e) => setDraft({ ...draft, rank_by_distance: e.target.checked })}
                />
                Rank by distance (restrict to circle)
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
                  Search radius
                </span>
                <Badge variant="secondary" className="font-mono text-[11px] font-normal tabular-nums">
                  {formatRadiusMeters(draft.radius_m)} · {Math.round(draft.radius_m)} m
                </Badge>
              </div>
              <Slider
                value={[draft.radius_m]}
                min={50}
                max={100_000}
                step={500}
                onValueChange={(v) => setDraft({ ...draft, radius_m: v[0] ?? draft.radius_m })}
                aria-label="Search radius"
              />
            </div>

            {run.error && (
              <span className="text-destructive text-[12px]">
                {run.error instanceof Error ? run.error.message : String(run.error)}
              </span>
            )}
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <DiscoverMap
            ref={mapRef}
            center={{ lat: draft.lat, lng: draft.lng }}
            radiusM={draft.radius_m}
            onCenterChange={handleCenterChange}
            leads={mapLeads}
            selectedLeadId={selectedLeadId}
            onLeadSelect={setSelectedLeadId}
          />

          {resultsForPanel.length > 0 && (
            <DiscoverResultsPanel
              results={resultsForPanel}
              selectedLeadId={selectedLeadId}
              onSelect={setSelectedLeadId}
            />
          )}

          {liveRun && (liveRun.status === "running" || liveRun.status === "failed") && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3">
              <div className="bg-popover/95 text-popover-foreground pointer-events-auto flex items-center gap-3 rounded-lg border border-border px-3 py-2 shadow-md backdrop-blur-sm">
                <RunStatusDot status={liveRun.status} />
                <div className="min-w-0 text-[12px]">
                  <div className="font-medium">
                    {liveRun.status === "running" ? "Discovering leads…" : "Discover failed"}
                  </div>
                  <div className="text-muted-foreground">
                    {liveRun.leadCount > 0
                      ? `${liveRun.leadCount} result${liveRun.leadCount === 1 ? "" : "s"}`
                      : liveRun.total > 0
                        ? `${liveRun.done} of ${liveRun.total}`
                        : "Waiting for results"}
                  </div>
                </div>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setOpenJobId(liveRun.jobId)}
                >
                  Logs
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="border-border shrink-0 border-t px-5 py-2">
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
            <span>
              Center:{" "}
              <span className="text-foreground font-mono tabular-nums">
                {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
              </span>
            </span>
            <span>Click the map or drag the pin to set the search center.</span>
            {liveRun?.status === "done" && jobSnapshot.data?.args && (
              <span className="font-mono tabular-nums">
                Last run center:{" "}
                {Number(jobSnapshot.data.args.lat).toFixed(5)},{" "}
                {Number(jobSnapshot.data.args.lng).toFixed(5)}
              </span>
            )}
          </div>
        </div>
      </section>

      <JobDrawer jobId={openJobId} onClose={() => setOpenJobId(null)} />
    </div>
  )
}

function RunStatusDot({
  status,
}: {
  status: "running" | "done" | "failed" | "cancelled"
}) {
  return (
    <span
      className={cn(
        "size-2 shrink-0 rounded-full",
        status === "running" && "bg-primary animate-pulse",
        status === "done" && "bg-emerald-500",
        status === "failed" && "bg-destructive",
        status === "cancelled" && "bg-muted-foreground",
      )}
      aria-hidden
    />
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
        {label}
      </span>
      {children}
    </label>
  )
}
