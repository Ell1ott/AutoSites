"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import { useTrackJob } from "@/lib/store/job-toaster"
import type { Flow2Node } from "@/lib/lead-flow-2"

/**
 * Starts the job behind a Flow-2 node. Crawl/markdown artifact nodes send only
 * `place_ids`; task nodes additionally send their `task` name. Completed leads
 * are excluded unless `force` is set (re-run), in which case the node's
 * `rerunnableLeadIds` are used. Errored leads are excluded unless
 * `includeErrored` is set.
 */
export function useFlow2Run() {
  const trackJob = useTrackJob()
  const qc = useQueryClient()
  const [runError, setRunError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async ({
      node,
      force,
      includeErrored,
      workers,
    }: {
      node: Flow2Node
      force?: boolean
      includeErrored?: boolean
      workers?: number
    }) => {
      const run = node.run
      if (!run) throw new Error("This node cannot be run.")

      const base = force ? node.rerunnableLeadIds : node.readyLeadIds
      const placeIds = Array.from(
        new Set([
          ...base,
          ...(includeErrored ? node.leadIdsByState.errored : []),
        ]),
      )
      if (placeIds.length === 0) {
        throw new Error("No eligible leads to run.")
      }

      const body: Record<string, unknown> = { place_ids: placeIds }
      if (force) body.force = true
      if (run.taskName) body.task = run.taskName
      if (run.supportsWorkers && typeof workers === "number") {
        body.workers = workers
      }

      const res = await api.startJob(run.kind, body)
      return { id: res.id, kind: run.kind, count: placeIds.length, label: node.label }
    },
    onSuccess: ({ id, kind, count, label }) => {
      trackJob(id, {
        title: `${label} · ${count} ${count === 1 ? "lead" : "leads"}`,
        kind,
      })
      qc.invalidateQueries({ queryKey: ["flow-2", "leads"] })
      qc.invalidateQueries({ queryKey: ["leads"] })
      qc.invalidateQueries({ queryKey: ["lead"] })
      qc.invalidateQueries({ queryKey: ["fields"] })
      qc.invalidateQueries({ queryKey: ["jobs"] })
    },
    onError: (e) => setRunError(e instanceof Error ? e.message : String(e)),
  })

  return {
    run: mutation.mutate,
    isRunning: mutation.isPending,
    runError,
    clearError: () => setRunError(null),
  }
}
