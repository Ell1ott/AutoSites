"use client"

import { useQuery } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  MoreHorizontalIcon,
  PlayIcon,
} from "@hugeicons/core-free-icons"

import { api } from "@/lib/api"
import { useSelectionStore } from "@/lib/store/selection"
import { cn } from "@/lib/utils"

/**
 * Bottom-center pill that appears whenever the user has any leads selected.
 *
 * Layout (left → right):
 *   [N] count badge · "selected" · task <Select/> · [⋯] · [Run] · [×]
 *
 * The Run / ⋯ buttons are placeholders; the real run-flow lands later when
 * POST /jobs is wired up. See // TODO(step 8) below.
 */
export function SelectionPill() {
  const size = useSelectionStore((s) => s.selected.size)
  const clear = useSelectionStore((s) => s.clear)

  // Task list — okay to error or be empty; pill must still render.
  const tasksQuery = useQuery({
    queryKey: ["ai-tasks"],
    queryFn: () => api.aiTasks(),
    staleTime: 60_000,
    retry: false,
    enabled: size > 0,
  })

  if (size === 0) return null

  const tasks = tasksQuery.data ?? []
  const tasksError = tasksQuery.isError
  const tasksEmpty = !tasksError && tasksQuery.isSuccess && tasks.length === 0

  return (
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
          )}
          aria-label="AI task"
          defaultValue=""
          disabled={tasksQuery.isPending}
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
        // Placeholder: future prompt/model/context editor. Step 8.
        onClick={() => {
          /* no-op for now */
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

      <button
        type="button"
        onClick={() => {
          // TODO(step 8): wire to POST /jobs
          console.log("would run task on selection of size", size)
        }}
        className={cn(
          "inline-flex h-7 items-center gap-1 rounded-full bg-primary px-3 text-[12px] font-medium text-primary-foreground",
          "hover:bg-primary/90",
        )}
      >
        <HugeiconsIcon icon={PlayIcon} size={12} strokeWidth={2} />
        Run
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
  )
}
