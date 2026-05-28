"use client"

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AiEventStream } from "@/components/ai/ai-event-stream"
import { AiOutputCard } from "@/components/ai/ai-output-card"
import { api } from "@/lib/api"
import { useEventStream } from "@/lib/sse"
import { cn } from "@/lib/utils"
import type { AiTask, JobEvent } from "@/lib/types"

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const MODEL_OPTIONS = [
  "claude-opus-4-7",
  "claude-sonnet-4-6",
  "claude-haiku-4-5-20251001",
  "gemini-3-flash-preview",
] as const

const DEFAULT_CONTEXT_SUGGESTIONS = [
  "screenshot",
  "reviews",
  "crawl_pages",
  "hours",
  "categories",
  "rating",
] as const

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type Props = {
  mode: "single" | "bulk"
  /** place_ids to target. */
  targetIds: string[]
  presetTaskName?: string
  /** Default true. When false the prompt textarea is hidden. */
  allowPromptEdit?: boolean
  /** Default false; trims paddings and textarea height. */
  compact?: boolean
  onJobStarted?: (jobId: string) => void
  className?: string
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function AiExperimenter({
  mode,
  targetIds,
  presetTaskName,
  allowPromptEdit = true,
  compact,
  onJobStarted,
  className,
}: Props): React.JSX.Element {
  const { data: tasks = [] } = useQuery({
    queryKey: ["ai-tasks"],
    queryFn: () => api.aiTasks(),
    staleTime: 60_000,
  })

  const [taskName, setTaskName] = useState<string>(presetTaskName ?? "")
  const task = useMemo<AiTask | null>(
    () => tasks.find((t) => t.name === taskName) ?? null,
    [tasks, taskName],
  )

  // Sync presetTaskName once tasks load.
  useEffect(() => {
    if (presetTaskName && !taskName) setTaskName(presetTaskName)
  }, [presetTaskName, taskName])

  const [prompt, setPrompt] = useState("")
  const [model, setModel] = useState("")
  const [included, setIncluded] = useState<string[] | undefined>(undefined)

  // Re-hydrate fields when the picked task changes.
  useEffect(() => {
    if (!task) return
    setPrompt(task.config.prompt_template ?? task.config.meta_prompt ?? "")
    setModel(task.config.model ?? "")
    setIncluded(task.config.included_context ?? undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.name])

  const [jobId, setJobId] = useState<string | null>(null)
  const [events, setEvents] = useState<JobEvent[]>([])
  const [runError, setRunError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  useEventStream<JobEvent>(jobId !== null, {
    url: `/jobs/${jobId}/stream`,
    onEvent: (e) => setEvents((prev) => [...prev, e]),
  })

  async function run(): Promise<void> {
    if (!task) {
      setRunError("Pick a task first.")
      return
    }
    setRunError(null)
    setEvents([])
    setJobId(null)
    setRunning(true)
    try {
      const tplDefault =
        task.config.prompt_template ?? task.config.meta_prompt ?? ""
      const overrides: Record<string, unknown> = {}
      if (prompt !== tplDefault) overrides.prompt = prompt
      if (model !== task.config.model) overrides.model = model
      if (
        included &&
        JSON.stringify(included) !==
          JSON.stringify(task.config.included_context ?? [])
      ) {
        overrides.included_context = included
      }
      const { id } = await api.startJob("ai_task", {
        task: task.name,
        place_ids: targetIds,
        ...(Object.keys(overrides).length ? { overrides } : {}),
      })
      setJobId(id)
      onJobStarted?.(id)
    } catch (e) {
      setRunError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  async function cancel(): Promise<void> {
    if (!jobId) return
    try {
      await api.cancelJob(jobId)
    } catch (e) {
      setRunError(e instanceof Error ? e.message : String(e))
    }
  }

  const tplDefault = task
    ? task.config.prompt_template ?? task.config.meta_prompt ?? ""
    : ""

  // Latest progress for bulk-mode summary.
  const latestProgress = useMemo(() => {
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i]
      if (e?.event === "progress") {
        return e.data as { done: number; total: number; eta_seconds?: number }
      }
    }
    return null
  }, [events])

  // Latest item_done outputs[output_field] for single-mode AiOutputCard.
  const latestOutput = useMemo<unknown>(() => {
    if (mode !== "single" || !task) return undefined
    const field = (task.config.output_field as string | undefined) ?? task.name
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i]
      if (e?.event === "item_done") {
        const data = e.data as {
          outputs?: Record<string, unknown>
        }
        if (data?.outputs && field in data.outputs) {
          return data.outputs[field]
        }
        // Fallback to whole outputs blob if the configured field is absent.
        if (data?.outputs) return data.outputs
      }
    }
    return undefined
  }, [events, mode, task])

  // Available models = constant list + task's current model if not present.
  const availableModels = useMemo(() => {
    const base = new Set<string>(MODEL_OPTIONS)
    if (task?.config.model) base.add(task.config.model)
    if (model && model.length > 0) base.add(model)
    return Array.from(base)
  }, [task?.config.model, model])

  // Context chip universe.
  const chipKeys = useMemo<string[]>(() => {
    if (!task) return []
    const fromTask = task.config.included_context
    if (Array.isArray(fromTask) && fromTask.length > 0) return fromTask
    return [...DEFAULT_CONTEXT_SUGGESTIONS]
  }, [task])

  function toggleChip(key: string): void {
    setIncluded((prev) => {
      const set = new Set(prev ?? [])
      if (set.has(key)) set.delete(key)
      else set.add(key)
      return Array.from(set)
    })
  }

  function handlePromptKeyDown(
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ): void {
    if (e.metaKey && e.key === "Enter") {
      e.preventDefault()
      void run()
    }
  }

  const fieldGap = compact ? "space-y-2" : "flex flex-col gap-3"
  const taLines = compact ? "min-h-[80px]" : "min-h-[140px]"

  return (
    <div className={cn(fieldGap, className)}>
      {/* Task picker */}
      <div className="flex flex-col gap-1">
        <label className="text-muted-foreground text-[11px] uppercase tracking-wide">
          Task
        </label>
        {tasks.length === 0 ? (
          <p className="text-muted-foreground text-sm">No tasks defined yet.</p>
        ) : (
          <Select value={taskName} onValueChange={setTaskName}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pick a task..." />
            </SelectTrigger>
            <SelectContent>
              {tasks.map((t) => (
                <SelectItem key={t.name} value={t.name}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Prompt */}
      {allowPromptEdit && task ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-muted-foreground text-[11px] uppercase tracking-wide">
              Prompt
            </label>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => setPrompt(tplDefault)}
              disabled={running || prompt === tplDefault}
            >
              Reset
            </Button>
          </div>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handlePromptKeyDown}
            disabled={running}
            className={cn("font-mono text-[12.5px]", taLines)}
          />
          <p className="text-muted-foreground text-[11px]">
            Cmd+Enter to run
          </p>
        </div>
      ) : null}

      {/* Model picker */}
      {task ? (
        <div className="flex items-center gap-2">
          <label className="text-muted-foreground text-[11px] uppercase tracking-wide">
            Model
          </label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a model..." />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {model && model === task.config.model ? (
            <span className="text-muted-foreground text-[11px]">default</span>
          ) : null}
        </div>
      ) : null}

      {/* Include chips — single mode only */}
      {task && mode === "single" && chipKeys.length > 0 ? (
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-[11px] uppercase tracking-wide">
            Include
          </label>
          <div className="flex flex-wrap gap-1.5">
            {chipKeys.map((key) => {
              const active = included?.includes(key) ?? false
              return (
                <Button
                  key={key}
                  type="button"
                  size="xs"
                  variant={active ? "secondary" : "outline"}
                  onClick={() => toggleChip(key)}
                  disabled={running}
                >
                  {key}
                </Button>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Target summary */}
      <p className="text-muted-foreground text-[12px]">
        {mode === "single"
          ? "Target: 1 lead"
          : `Target: ${targetIds.length} lead${targetIds.length === 1 ? "" : "s"}`}
      </p>

      {/* Run row */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={() => void run()}
          disabled={!task || running || targetIds.length === 0}
          size={compact ? "sm" : "default"}
        >
          {running ? (
            <HugeiconsIcon
              icon={Loading03Icon}
              size={14}
              className="animate-spin"
            />
          ) : null}
          Run
        </Button>
        {running && jobId ? (
          <Button
            type="button"
            variant="ghost"
            size={compact ? "sm" : "default"}
            onClick={() => void cancel()}
          >
            Cancel
          </Button>
        ) : null}
      </div>

      {/* Run-time error */}
      {runError ? (
        <p className="text-destructive text-[13px]">{runError}</p>
      ) : null}

      {/* Output panel */}
      {events.length > 0 ? (
        <div
          className={cn(
            compact ? fieldGap : "flex min-h-48 flex-1 flex-col gap-3",
          )}
        >
          {mode === "single" && task && latestOutput !== undefined ? (
            <AiOutputCard task={task} output={latestOutput} />
          ) : null}

          {mode === "bulk" && latestProgress ? (
            <BulkProgress
              done={latestProgress.done}
              total={latestProgress.total}
              eta={latestProgress.eta_seconds}
            />
          ) : null}

          <AiEventStream
            events={events}
            mode="stream"
            autoScroll
            levelFilter="info"
            className={cn(
              "rounded-md border bg-card",
              compact ? "h-40" : "min-h-48 flex-1",
            )}
          />
        </div>
      ) : null}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Bulk progress sub-component
// -----------------------------------------------------------------------------

function BulkProgress({
  done,
  total,
  eta,
}: {
  done: number
  total: number
  eta?: number
}): React.JSX.Element {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center justify-between text-[12px]">
        <span>
          {done}/{total}
        </span>
        {typeof eta === "number" ? (
          <span className="text-muted-foreground">{eta}s remaining</span>
        ) : null}
      </div>
      <div className="bg-muted relative mt-2 h-1.5 w-full overflow-hidden rounded-full">
        <div
          className="bg-primary absolute left-0 top-0 h-full transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
