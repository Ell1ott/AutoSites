"use client"

import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { SlimLead } from "@/lib/types"

/**
 * Fetches every lead in a single request. The dataset is small (~hundreds),
 * so list views get one in-memory array to filter/sort client-side.
 */
export function useLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: async (): Promise<SlimLead[]> => {
      const page = await api.leads({ slim: true })
      return page.items
    },
    staleTime: 30_000,
  })
}
