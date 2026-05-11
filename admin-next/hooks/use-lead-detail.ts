"use client"

import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import { MOCK_LEADS } from "@/lib/mock-leads"
import type { Lead } from "@/lib/types"

/**
 * Fetches a single lead detail. Falls back to MOCK_LEADS (coerced to Lead)
 * when the backend is unreachable AND `NEXT_PUBLIC_USE_MOCKS=1` — mirrors
 * the leads-list page's offline behaviour.
 */
export function useLeadDetail(id: string) {
  return useQuery<Lead>({
    queryKey: ["lead", id],
    queryFn: async (): Promise<Lead> => {
      try {
        return await api.lead(id)
      } catch (e) {
        if (process.env.NEXT_PUBLIC_USE_MOCKS === "1") {
          const slim = MOCK_LEADS.find((l) => l.place_id === id)
          if (slim) {
            return { ...slim, data: {}, recent_logs: [] } as Lead
          }
        }
        throw e
      }
    },
    staleTime: 30_000,
  })
}
