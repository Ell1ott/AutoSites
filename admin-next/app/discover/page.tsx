"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Delete02Icon, PlayIcon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { JobDrawer } from "@/components/queue/job-drawer"
import { formatRelativeTime } from "@/components/queue/relative-time"
import { useQueriesStore, newQueryId, type SavedQuery } from "@/lib/store/queries"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

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

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Omit<SavedQuery, "id">>(DEFAULT_QUERY)
  const [openJobId, setOpenJobId] = useState<string | null>(null)
  const qc = useQueryClient()

  const selected = useMemo(
    () => queries.find((q) => q.id === selectedId) ?? null,
    [queries, selectedId],
  )

  useEffect(() => {
    if (selected) {
      const { id: _id, last_run_at: _lr, last_job_id: _lj, ...rest } = selected
      setDraft(rest)
    }
  }, [selectedId, selected])

  function newQuery() {
    setSelectedId(null)
    setDraft(DEFAULT_QUERY)
  }

  function save(): SavedQuery {
    const id = selectedId ?? newQueryId()
    const next: SavedQuery = {
      id,
      ...draft,
      name: draft.name.trim() || draft.text_query,
      last_run_at: selected?.last_run_at,
      last_job_id: selected?.last_job_id,
    }
    upsert(next)
    setSelectedId(id)
    return next
  }

  const run = useMutation({
    mutationFn: async () => {
      const saved = save()
      const job = await api.startJob("fetch_leads", {
        text_query: saved.text_query,
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
      return job
    },
    onSuccess: (job) => setOpenJobId(job.id),
  })

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
            No saved queries yet. Fill the form on the right and click Save.
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
                    {q.text_query} · {q.lat.toFixed(3)},{q.lng.toFixed(3)} · n={q.count}
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

      <section className="flex min-h-0 flex-col overflow-y-auto p-5">
        <header className="mb-4 flex items-baseline gap-3">
          <h1 className="text-[15px] font-medium">
            {selectedId ? "Edit query" : "New query"}
          </h1>
          {selected?.last_job_id && (
            <button
              type="button"
              onClick={() => setOpenJobId(selected.last_job_id!)}
              className="text-primary text-[12px] hover:underline"
            >
              View last run →
            </button>
          )}
        </header>

        <div className="grid max-w-2xl grid-cols-1 gap-3">
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

          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude">
              <Input
                type="number"
                step="any"
                value={draft.lat}
                onChange={(e) => setDraft({ ...draft, lat: Number(e.target.value) })}
                className="h-8"
              />
            </Field>
            <Field label="Longitude">
              <Input
                type="number"
                step="any"
                value={draft.lng}
                onChange={(e) => setDraft({ ...draft, lng: Number(e.target.value) })}
                className="h-8"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Radius (meters)">
              <Input
                type="number"
                min={50}
                max={100_000}
                value={draft.radius_m}
                onChange={(e) => setDraft({ ...draft, radius_m: Number(e.target.value) })}
                className="h-8"
              />
            </Field>
            <Field label="Count (1–100)">
              <Input
                type="number"
                min={1}
                max={100}
                value={draft.count}
                onChange={(e) => setDraft({ ...draft, count: Number(e.target.value) })}
                className="h-8"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <label className="flex items-center gap-2 text-[12px]">
            <input
              type="checkbox"
              checked={draft.rank_by_distance ?? true}
              onChange={(e) => setDraft({ ...draft, rank_by_distance: e.target.checked })}
            />
            Rank by distance
          </label>
        </div>

        <Separator className="my-5 max-w-2xl" />

        <div className="flex items-center gap-2">
          <Button onClick={save} variant="outline" size="sm">
            {selectedId ? "Save changes" : "Save query"}
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
          {run.error && (
            <span className="text-destructive text-[12px]">
              {run.error instanceof Error ? run.error.message : String(run.error)}
            </span>
          )}
        </div>
      </section>

      <JobDrawer jobId={openJobId} onClose={() => setOpenJobId(null)} />
    </div>
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
