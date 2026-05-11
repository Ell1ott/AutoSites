"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type SavedQuery = {
  id: string
  name: string
  text_query: string
  lat: number
  lng: number
  radius_m: number
  count: number
  region_code?: string
  language_code?: string
  rank_by_distance?: boolean
  last_run_at?: string
  last_job_id?: string
}

type QueriesState = {
  queries: SavedQuery[]
  upsert: (q: SavedQuery) => void
  remove: (id: string) => void
  recordRun: (id: string, jobId: string) => void
}

export function newQueryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `q-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

export const useQueriesStore = create<QueriesState>()(
  persist(
    (set) => ({
      queries: [],
      upsert: (q) =>
        set((s) => {
          const idx = s.queries.findIndex((x) => x.id === q.id)
          const next = [...s.queries]
          if (idx >= 0) next[idx] = q
          else next.unshift(q)
          return { queries: next }
        }),
      remove: (id) => set((s) => ({ queries: s.queries.filter((q) => q.id !== id) })),
      recordRun: (id, jobId) =>
        set((s) => ({
          queries: s.queries.map((q) =>
            q.id === id
              ? { ...q, last_run_at: new Date().toISOString(), last_job_id: jobId }
              : q,
          ),
        })),
    }),
    { name: "admin-next.queries" },
  ),
)
