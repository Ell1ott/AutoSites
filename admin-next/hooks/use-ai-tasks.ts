"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import { MOCK_TASKS } from "@/lib/mock-tasks"
import type { AiTask } from "@/lib/types"

const USING_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1"

const MOCK_TASKS_KEY = "admin-next.mock-tasks"

/**
 * Read locally-persisted, optimistic mock tasks. Used only when the backend is
 * unreachable and `NEXT_PUBLIC_USE_MOCKS=1`. Anything created via
 * `api.createAiTask` while in mock-fallback mode is written here so the new
 * row shows up immediately after the dialog closes.
 */
export function readLocalMockTasks(): AiTask[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(MOCK_TASKS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AiTask[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

export function writeLocalMockTasks(tasks: AiTask[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(MOCK_TASKS_KEY, JSON.stringify(tasks))
  } catch {
    // Storage full / disabled — silently ignore.
  }
}

export function upsertLocalMockTask(task: AiTask): void {
  const cur = readLocalMockTasks()
  const next = cur.filter((t) => t.name !== task.name).concat(task)
  writeLocalMockTasks(next)
}

/**
 * Shared TanStack Query hook for /ai-tasks. Consumers:
 *   - `<TaskList/>` and `<TaskEditor/>` on the Tasks page
 *   - `<SelectionPill/>` (re-uses the same query key)
 *   - `<AiExperimenter/>` (also re-uses the same query key)
 *
 * `data` always returns a stable array. When the request fails AND
 * `NEXT_PUBLIC_USE_MOCKS=1`, it merges `MOCK_TASKS` with any locally-created
 * mock tasks from localStorage. The merge order is: mocks first, locally
 * persisted overrides last so renamed/disabled tasks win.
 */
export function useAiTasks() {
  const query = useQuery<AiTask[]>({
    queryKey: ["ai-tasks"],
    queryFn: () => api.aiTasks(),
    staleTime: 60_000,
    retry: false,
  })

  const usingMockFallback = USING_MOCKS && query.isError

  const tasks = useMemo<AiTask[]>(() => {
    if (query.data) return query.data
    if (usingMockFallback) {
      const local = readLocalMockTasks()
      const byName = new Map<string, AiTask>()
      for (const t of MOCK_TASKS) byName.set(t.name, t)
      for (const t of local) byName.set(t.name, t)
      return Array.from(byName.values()).sort(
        (a, b) => a.sort_order - b.sort_order,
      )
    }
    return []
  }, [query.data, usingMockFallback])

  return {
    tasks,
    isPending: query.isPending && !usingMockFallback,
    isError: query.isError && !usingMockFallback,
    error: query.error,
    refetch: query.refetch,
    usingMockFallback,
  }
}
