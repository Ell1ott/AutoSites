"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  MoreHorizontalIcon,
  PlayIcon,
} from "@hugeicons/core-free-icons"

import { api } from "@/lib/api"
import { useLeads } from "@/hooks/use-leads"
import { useSelectionStore } from "@/lib/store/selection"
import { useTrackJob } from "@/lib/store/job-toaster"
import { cn } from "@/lib/utils"
import { jobKindForTask } from "@/lib/job-kind"
import {
  ParallelStepper,
  defaultWorkers,
} from "@/components/tasks/parallel-stepper"
import { missingInputsForLead } from "@/lib/missing-inputs"
import type { AiTask, SlimLead } from "@/lib/types"

/**
 * Bottom-center pill that appears whenever the user has any leads selected.
 *
 * Layout (left → right):
 *   [N] count badge · "selected" · task <Select/> · [⋯] · [Run] · [×]
 */
export function SelectionPill() {
  const size = useSelectionStore((s) => s.selected.size)
  const selected = useSelectionStore((s) => s.selected)
  const clear = useSelectionStore((s) => s.clear)
  const taskName = useSelectionStore((s) => s.taskName)
  const setTaskName = useSelectionStore((s) => s.setTaskName)
  const trackJob = useTrackJob()
  const qc = useQueryClient()

  const [runError, setRunError] = useState<string | null>(null)
  const [workersOverride, setWorkersOverride] = useState<number | null>(null)

  const tasksQuery = useQuery({
    queryKey: ["ai-tasks"],
    queryFn: () => api.aiTasks(),
    staleTime: 60_000,
    retry: false,
    enabled: size > 0,
  })

  // Cached lead rows used to check missing inputs against the chosen task.
  // No extra fetch — useLeads is the same query the table uses.
  const leadsQuery = useLeads()
  const leadsById = useMemo<Map<string, SlimLead>>(() => {
    const m = new Map<string, SlimLead>()
    for (const l of leadsQuery.data ?? []) m.set(l.place_id, l)
    return m
  }, [leadsQuery.data])

  const runMut = useMutation({
    mutationFn: async (input: {
      task: AiTask
      placeIds: string[]
      workers?: number
    }) => {
      const kind = jobKindForTask(input.task)
      const body: Record<string, unknown> = {
        task: input.task.name,
        place_ids: input.placeIds,
      }
      if (typeof input.workers === "number") body.workers = input.workers
      const res = await api.startJob(kind, body)
      return {
        id: res.id,
        kind,
        task: input.task,
        placeCount: input.placeIds.length,
      }
    },
    onSuccess: ({ id, kind, task, placeCount }) => {
      trackJob(id, {
        title: `${task.label || task.name} · ${placeCount} ${
          placeCount === 1 ? "lead" : "leads"
        }`,
        kind,
      })
      qc.invalidateQueries({ queryKey: ["leads"] })
    },
    onError: (e) => {
      setRunError(e instanceof Error ? e.message : String(e))
    },
  })

  const tasks = tasksQuery.data ?? []
  const tasksError = tasksQuery.isError
  const tasksEmpty = !tasksError && tasksQuery.isSuccess && tasks.length === 0
  const currentTask = tasks.find((t) => t.name === taskName)

  const { validIds, skippedCount } = useMemo(() => {
    if (
      !currentTask ||
      currentTask.task_type === "browser_agent" ||
      currentTask.task_type === "variant"
    ) {
      return { validIds: Array.from(selected), skippedCount: 0 }
    }
    const valid: string[] = []
    let skipped = 0
    for (const id of selected) {
      const lead = leadsById.get(id)
      // Unknown lead (e.g. selected on a different page) → trust it; backend
      // will still skip with MissingInputError if deps are absent.
      if (!lead) {
        valid.push(id)
        continue
      }
      if (missingInputsForLead(lead, currentTask.config).length > 0) {
        skipped += 1
      } else {
        valid.push(id)
      }
    }
    return { validIds: valid, skippedCount: skipped }
  }, [currentTask, selected, leadsById])

  if (size === 0) return null

  const canRun = !!currentTask && !runMut.isPending && validIds.length > 0

  const isParallelizable =
    !!currentTask &&
    currentTask.task_type !== "browser_agent" &&
    currentTask.task_type !== "variant"

  function handleRun() {
    if (!currentTask || validIds.length === 0) return
    setRunError(null)
    const workers = isParallelizable
      ? workersOverride ?? defaultWorkers(validIds.length)
      : undefined
    runMut.mutate({ task: currentTask, placeIds: validIds, workers })
  }

  return (
    <>
      {runError ? (
        <div
          role="alert"
          className="fixed bottom-16 left-1/2 z-50 max-w-[60ch] -translate-x-1/2 truncate rounded-md bg-red-900 px-3 py-1.5 text-[12px] text-red-50 shadow-lg ring-1 ring-red-700"
        >
          {runError}
        </div>
      ) : null}
      <div
        role="region"
        aria-label="Selection actions"
        className={cn(
          "fixed bottom-4 left-1/2 z-50 -translate-x-1/2",
          "flex h-9 items-center gap-1 rounded-full",
          "bg-zinc-900 text-zinc-100 shadow-lg ring-1 ring-black/30",
          "pl-3 pr-1",
        )}
      >
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
          {size}
        </span>
        <span className="text-[12px] text-zinc-300">selected</span>

        <span className="mx-1 h-4 w-px bg-zinc-700" aria-hidden />

        {tasksError ? (
          <span className="px-2 text-[11px] text-zinc-400">
            Tasks unavailable
          </span>
        ) : tasksEmpty ? (
          <span className="px-2 text-[11px] text-zinc-400">
            No tasks defined
          </span>
        ) : (
          <select
            className={cn(
              "h-7 max-w-[180px] truncate rounded-full bg-zinc-800 px-2 text-[12px] text-zinc-100",
              "outline-none ring-0 hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-primary/60",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
            aria-label="AI task"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            disabled={tasksQuery.isPending || runMut.isPending}
          >
            <option value="" disabled>
              {tasksQuery.isPending ? "Loading…" : "Choose task…"}
            </option>
            {tasks.map((t) => (
              <option key={t.name} value={t.name}>
                {t.label || t.name}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={() => {
            /* placeholder: future prompt/model/context editor */
          }}
          aria-label="Edit prompt"
          className="ml-1 inline-flex size-7 items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <HugeiconsIcon
            icon={MoreHorizontalIcon}
            size={14}
            strokeWidth={1.75}
          />
        </button>

        {isParallelizable ? (
          <ParallelStepper
            variant="dark"
            value={workersOverride ?? defaultWorkers(validIds.length)}
            onChange={setWorkersOverride}
            disabled={runMut.isPending}
            className="ml-1"
          />
        ) : null}

        {skippedCount > 0 ? (
          <span
            className="px-1 text-[11px] text-amber-400"
            title={`${skippedCount} selected lead${
              skippedCount === 1 ? "" : "s"
            } missing required inputs — will be skipped on Run`}
          >
            {skippedCount} skip
          </span>
        ) : null}

        <button
          type="button"
          onClick={handleRun}
          disabled={!canRun}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-full bg-primary px-3 text-[12px] font-medium text-primary-foreground",
            "hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <HugeiconsIcon icon={PlayIcon} size={12} strokeWidth={2} />
          {runMut.isPending
            ? "Starting…"
            : skippedCount > 0
              ? `Run ${validIds.length}`
              : "Run"}
        </button>

        <button
          type="button"
          onClick={() => clear()}
          aria-label="Clear selection"
          className="inline-flex size-7 items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2} />
        </button>
      </div>
    </>
  )
}
