"use client"

import * as React from "react"
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon } from "@hugeicons/core-free-icons"

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
import type { AiTask } from "@/lib/types"

const USING_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1"

type Props = {
  selectedTaskName: string | null
  onSelect: (taskName: string) => void
}

// kebab-case validator: alphanumeric + hyphens + underscores. Allowed first
// char is a letter.
function isValidName(name: string): boolean {
  return /^[a-z][a-z0-9_-]*$/.test(name)
}

export function TaskList({
  selectedTaskName,
  onSelect,
}: Props): React.JSX.Element {
  const { tasks, isPending, isError, usingMockFallback } = useAiTasks()
  const qc = useQueryClient()

  const sorted = React.useMemo(
    () => tasks.slice().sort((a, b) => a.sort_order - b.sort_order),
    [tasks],
  )

  // ----- enabled toggle (optimistic patch) -----
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
      // Mock-friendly: if backend rejects and we're in mocks mode, persist the
      // toggle to localStorage instead. Otherwise roll back the optimistic write.
      if (USING_MOCKS) {
        const cur = qc.getQueryData<AiTask[]>(["ai-tasks"])
        const tgt = cur?.find((t) => t.name === _args.name)
        if (tgt) upsertLocalMockTask({ ...tgt, enabled: _args.enabled })
        return
      }
      if (ctx?.prev) qc.setQueryData(["ai-tasks"], ctx.prev)
    },
    onSettled: () => {
      // Refetch only if we're not in offline-mock mode (so we don't blow away
      // optimistic writes that the backend would 404 on).
      if (!USING_MOCKS) qc.invalidateQueries({ queryKey: ["ai-tasks"] })
    },
  })

  // ----- new task -----
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [draftName, setDraftName] = useState("")
  const [draftLabel, setDraftLabel] = useState("")
  const [draftError, setDraftError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  function resetDraft() {
    setDraftName("")
    setDraftLabel("")
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
    const minimal: Omit<AiTask, "updated_at"> = {
      name,
      label,
      enabled: true,
      sort_order: (sorted.at(-1)?.sort_order ?? 0) + 10,
      config: { model: "claude-sonnet-4-6", prompt_template: "" },
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
        // Re-evaluate the mock fallback path; some consumers read from the
        // hook's merged output rather than the raw query data.
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
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-3 py-2">
        <h2 className="text-[13px] font-medium">Tasks</h2>
        <Popover
          open={popoverOpen}
          onOpenChange={(o) => {
            setPopoverOpen(o)
            if (!o) resetDraft()
          }}
        >
          <PopoverTrigger asChild>
            <Button type="button" size="xs" variant="outline">
              <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={1.75} />
              New task
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-3" sideOffset={4}>
            <div className="flex flex-col gap-2">
              <div className="text-[12px] font-medium">New task</div>
              <div className="flex flex-col gap-1">
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
              <div className="flex flex-col gap-1">
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

      <div className="flex-1 overflow-y-auto">
        {usingMockFallback ? (
          <div className="px-3 py-1.5 text-[11px] text-yellow-600 dark:text-yellow-500">
            Backend offline — using mock tasks.
          </div>
        ) : null}

        {isPending ? (
          <div className="flex flex-col gap-1 p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-md bg-muted/40"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="p-4 text-[12px] text-muted-foreground">
            Couldn&apos;t load tasks.
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-4 text-[12px] text-muted-foreground">
            No tasks yet. Create one above.
          </div>
        ) : (
          <ul className="flex flex-col">
            {sorted.map((t) => {
              const active = t.name === selectedTaskName
              return (
                <li key={t.name}>
                  <button
                    type="button"
                    onClick={() => onSelect(t.name)}
                    className={cn(
                      "group/row flex w-full items-center justify-between gap-2 border-b border-border/60 px-3 py-2 text-left transition-colors",
                      active ? "bg-accent" : "hover:bg-muted/40",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium">
                        {t.label || t.name}
                      </div>
                      <div className="truncate font-mono text-[10px] text-muted-foreground">
                        {t.name}
                      </div>
                    </div>
                    <EnabledToggle
                      enabled={t.enabled}
                      onToggle={() =>
                        toggleMut.mutate({
                          name: t.name,
                          enabled: !t.enabled,
                        })
                      }
                    />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Small enabled toggle (no shadcn switch component — inline pill).
// -----------------------------------------------------------------------------

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
        "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors",
        enabled ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block h-3 w-3 transform rounded-full bg-background shadow transition-transform",
          enabled ? "translate-x-3.5" : "translate-x-0.5",
        )}
      />
    </button>
  )
}
