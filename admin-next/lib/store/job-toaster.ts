// Ephemeral bottom-right job overlay state. Reusable across any AI/job
// callsite that doesn't have its own dedicated progress UI.
//
// Usage from a callsite (after POSTing a job and receiving an id):
//   const track = useTrackJob()
//   const { id } = await api.startJob(...)
//   track(id, { title: "Rerun: enrich_company", kind: "ai_task" })
//
// The card mounts, subscribes to /jobs/:id/stream via SSE, shows live
// progress, auto-dismisses on success after 5s, lingers on error.

"use client"

import { useCallback } from "react"
import { create } from "zustand"

import type { JobKind } from "@/lib/types"

export type JobToast = {
  id: string                 // job id (uuid from backend)
  title: string              // human label, e.g. "Rerun: enrich_company"
  kind: JobKind
  startedAt: number          // Date.now() when tracking began
  expanded: boolean
}

type JobToasterState = {
  toasts: JobToast[]
  track: (id: string, meta: { title: string; kind: JobKind }) => void
  dismiss: (id: string) => void
  setExpanded: (id: string, v: boolean) => void
}

export const useJobToasterStore = create<JobToasterState>((set) => ({
  toasts: [],

  track: (id, meta) =>
    set((s) => {
      if (s.toasts.some((t) => t.id === id)) return s
      const toast: JobToast = {
        id,
        title: meta.title,
        kind: meta.kind,
        startedAt: Date.now(),
        expanded: false,
      }
      return { toasts: [toast, ...s.toasts] }
    }),

  dismiss: (id) =>
    set((s) => {
      if (!s.toasts.some((t) => t.id === id)) return s
      return { toasts: s.toasts.filter((t) => t.id !== id) }
    }),

  setExpanded: (id, v) =>
    set((s) => {
      let changed = false
      const next = s.toasts.map((t) => {
        if (t.id !== id || t.expanded === v) return t
        changed = true
        return { ...t, expanded: v }
      })
      return changed ? { toasts: next } : s
    }),
}))

// -----------------------------------------------------------------------------
// Selectors
// -----------------------------------------------------------------------------

/**
 * Stable callback for tracking a new job. Pass the job id returned from
 * `api.startJob(...)` along with a short title and the kind.
 */
export function useTrackJob(): (
  id: string,
  meta: { title: string; kind: JobKind },
) => void {
  const track = useJobToasterStore((s) => s.track)
  return useCallback(track, [track])
}
