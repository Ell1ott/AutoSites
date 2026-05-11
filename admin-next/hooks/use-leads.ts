"use client"

import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { SlimLead } from "@/lib/types"

/**
 * Fetches every lead by walking the cursor pagination transparently. The
 * dataset is small (~hundreds), so paying one query for the full list keeps
 * the list views simple — they get a single in-memory array to filter/sort.
 */
export function useLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const out: SlimLead[] = []
      let cursor: string | undefined
      for (;;) {
        const page = await api.leads({ slim: true, cursor })
        out.push(...page.items)
        if (!page.next_cursor) break
        cursor = page.next_cursor
      }
      return out
    },
    staleTime: 30_000,
  })
}
