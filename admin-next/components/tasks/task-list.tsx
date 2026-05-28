"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Search01Icon,
  Task01Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  useAiTasks,
  upsertLocalMockTask,
} from "@/hooks/use-ai-tasks"
import { api, ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { AiTask, AiTaskType } from "@/lib/types"

const USING_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1"

type Props = {
  selectedTaskName: string | null
  onSelect: (taskName: string) => void
}

function isValidName(name: string): boolean {
  return /^[a-z][a-z0-9_-]*$/.test(name)
}

const TYPE_META: Record<AiTaskType, { label: string; color: string }> = {
  place: { label: "LLM", color: "var(--chart-1)" },
  browser_agent: { label: "Agent", color: "var(--chart-4)" },
  variant: { label: "Variant", color: "var(--chart-3)" },
}

export function TaskList({
  selectedTaskName,
  onSelect,
}: Props): React.JSX.Element {
  const { tasks, isPending, isError, usingMockFallback } = useAiTasks()
  const qc = useQueryClient()

  const sorted = useMemo(
    () => tasks.slice().sort((a, b) => a.sort_order - b.sort_order),
    [tasks],
  )

  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.label ?? "").toLowerCase().includes(q),
    )
  }, [sorted, query])

  const toggleMut = useMutation({
    mutationFn: async ({ name, enabled }: { name: string; enabled: boolean }) =>
      api.patchAiTask(name, { enabled }),
    onMutate: async ({ name, enabled }) => {
      await qc.cancelQueries({ queryKey: ["ai-tasks"] })
      const prev = qc.getQueryData<AiTask[]>(["ai-tasks"])
      if (prev) {
        qc.setQueryData<AiTask[]>(
          ["ai-tasks"],
          prev.map((t) => (t.name === name ? { ...t, enabled } : t)),
        )
      }
      return { prev }
    },
    onError: (_err, _args, ctx) => {
      if (USING_MOCKS) {
        const cur = qc.getQueryData<AiTask[]>(["ai-tasks"])
        const tgt = cur?.find((t) => t.name === _args.name)
        if (tgt) upsertLocalMockTask({ ...tgt, enabled: _args.enabled })
        return
      }
      if (ctx?.prev) qc.setQueryData(["ai-tasks"], ctx.prev)
    },
    onSettled: () => {
      if (!USING_MOCKS) qc.invalidateQueries({ queryKey: ["ai-tasks"] })
    },
  })

  // ----- new task -----
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [draftName, setDraftName] = useState("")
  const [draftLabel, setDraftLabel] = useState("")
  const [draftType, setDraftType] = useState<AiTaskType>("place")
  const [draftError, setDraftError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  function resetDraft() {
    setDraftName("")
    setDraftLabel("")
    setDraftType("place")
    setDraftError(null)
  }

  async function createTask() {
    setDraftError(null)
    const name = draftName.trim()
    const label = draftLabel.trim() || name
    if (!isValidName(name)) {
      setDraftError("Use kebab-case: letters, digits, dashes/underscores.")
      return
    }
    if (sorted.some((t) => t.name === name)) {
      setDraftError("That name is already taken.")
      return
    }
    const baseConfig =
      draftType === "browser_agent"
        ? {
            model: "gemma-4-26b-a4b-it",
            prompt_template: "",
            start_url_template: "https://dribbble.com/search/{{query}}?s=popular",
            max_picks: 5,
            output_field: name,
          }
        : draftType === "variant"
          ? {
              output_field: "variant_design",
              start_url: "https://variant.com/projects",
              generation_timeout_s: 900,
            }
          : { model: "claude-sonnet-4-6", prompt_template: "" }
    const minimal: Omit<AiTask, "updated_at"> = {
      name,
      label,
      enabled: true,
      sort_order: (sorted.at(-1)?.sort_order ?? 0) + 10,
      task_type: draftType,
      config: baseConfig,
    }
    setCreating(true)
    try {
      const created = await api.createAiTask(minimal)
      qc.setQueryData<AiTask[]>(["ai-tasks"], (prev) =>
        prev ? [...prev, created] : [created],
      )
      onSelect(created.name)
      setPopoverOpen(false)
      resetDraft()
    } catch (err) {
      if (USING_MOCKS) {
        const fake: AiTask = {
          ...minimal,
          updated_at: new Date().toISOString(),
        }
        upsertLocalMockTask(fake)
        qc.setQueryData<AiTask[]>(["ai-tasks"], (prev) =>
          prev ? [...prev, fake] : [fake],
        )
        onSelect(fake.name)
        setPopoverOpen(false)
        resetDraft()
      } else {
        setDraftError(
          err instanceof ApiError ? err.message : (err as Error).message,
        )
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border/60 bg-background px-5 pb-4 pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[15px] font-semibold tracking-tight">Tasks</h2>
            <p className="text-[11px] text-muted-foreground">
              {sorted.filter((t) => t.enabled).length} active ·{" "}
              {sorted.length - sorted.filter((t) => t.enabled).length} paused
            </p>
          </div>
          <Popover
            open={popoverOpen}
            onOpenChange={(o) => {
              setPopoverOpen(o)
              if (!o) resetDraft()
            }}
          >
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 cursor-pointer gap-1.5"
              >
                <HugeiconsIcon icon={Add01Icon} size={13} strokeWidth={1.75} />
                New task
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-4" sideOffset={6}>
              <div className="flex flex-col gap-3">
                <div className="text-[13px] font-semibold">New task</div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Name
                  </label>
                  <Input
                    autoFocus
                    value={draftName}
                    onChange={(e) =>
                      setDraftName(
                        e.target.value
                          .toLowerCase()
                          .replace(/\s+/g, "_")
                          .replace(/[^a-z0-9_-]/g, ""),
                      )
                    }
                    placeholder="e.g. visual_rating"
                    className="h-8 font-mono text-[12px]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Label
                  </label>
                  <Input
                    value={draftLabel}
                    onChange={(e) => setDraftLabel(e.target.value)}
                    placeholder="Visual rating"
                    className="h-8 text-[12px]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Type
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["place", "browser_agent", "variant"] as AiTaskType[]).map(
                      (t) => {
                        const active = draftType === t
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setDraftType(t)}
                            className={cn(
                              "cursor-pointer rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors",
                              active
                                ? "border-foreground/20 bg-muted text-foreground"
                                : "border-border bg-background text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {TYPE_META[t].label}
                          </button>
                        )
                      },
                    )}
                  </div>
                </div>
                {draftError ? (
                  <p className="text-[11px] text-destructive">{draftError}</p>
                ) : null}
                <div className="flex justify-end gap-1.5 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      setPopoverOpen(false)
                      resetDraft()
                    }}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    onClick={() => void createTask()}
                    disabled={creating || draftName.trim() === ""}
                  >
                    Create
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <HugeiconsIcon
            icon={Search01Icon}
            size={13}
            strokeWidth={1.75}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks"
            className="h-8 pl-8 text-[12px]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {usingMockFallback ? (
          <div className="mb-2 px-1 text-[11px] text-yellow-600 dark:text-yellow-500">
            Backend offline — using mock tasks.
          </div>
        ) : null}

        {isPending ? (
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-[52px] animate-pulse rounded-md bg-muted/40"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="p-6 text-center text-[12px] text-muted-foreground">
            Couldn&apos;t load tasks.
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
            <HugeiconsIcon
              icon={Task01Icon}
              size={20}
              strokeWidth={1.5}
              className="text-muted-foreground"
            />
            <p className="text-[12px] text-muted-foreground">
              {sorted.length === 0
                ? "No tasks yet. Create one above."
                : "No tasks match your search."}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {filtered.map((t) => {
              const active = t.name === selectedTaskName
              const meta = TYPE_META[t.task_type]
              return (
                <li key={t.name}>
                  <div
                    className={cn(
                      "group flex items-center gap-2.5 rounded-md px-3 py-2.5 transition-colors",
                      active ? "bg-muted" : "hover:bg-muted/50",
                    )}
                  >
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full transition-opacity"
                      style={{
                        backgroundColor: meta.color,
                        opacity: t.enabled ? 1 : 0.3,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => onSelect(t.name)}
                      className="min-w-0 flex-1 cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "truncate text-[13px] font-medium",
                            !t.enabled && "text-muted-foreground",
                          )}
                        >
                          {t.label || t.name}
                        </span>
                        <span
                          className="shrink-0 text-[10px] font-medium uppercase tracking-wide"
                          style={{ color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground">
                        {t.name}
                      </div>
                    </button>
                    <EnabledToggle
                      enabled={t.enabled}
                      onToggle={() =>
                        toggleMut.mutate({
                          name: t.name,
                          enabled: !t.enabled,
                        })
                      }
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function EnabledToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean
  onToggle: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      role="switch"
      aria-checked={enabled}
      aria-label={enabled ? "Disable task" : "Enable task"}
      className={cn(
        "relative inline-flex h-[18px] w-[30px] shrink-0 cursor-pointer items-center rounded-full transition-colors",
        enabled ? "bg-primary" : "bg-muted-foreground/25",
      )}
    >
      <span
        className={cn(
          "inline-block h-[14px] w-[14px] rounded-full bg-background shadow-sm transition-transform",
          enabled ? "translate-x-[14px]" : "translate-x-[2px]",
        )}
      />
    </button>
  )
}
