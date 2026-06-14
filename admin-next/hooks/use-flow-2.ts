"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import { useAiTasks } from "@/hooks/use-ai-tasks"
import { useFields } from "@/hooks/use-fields"
import { useJobs } from "@/hooks/use-jobs"
import { buildLeadFlow2Snapshot } from "@/lib/lead-flow-2"
import type { Flow2Snapshot } from "@/lib/lead-flow-2"
import type { LeadsListResponse } from "@/lib/types"

/**
 * Composes the live data sources Flow-2 needs and derives a {@link Flow2Snapshot}
 * entirely client-side. Leads are fetched with their reported `total` so the
 * snapshot can warn when counts are based on a partial load.
 */
export function useFlow2({
  includeDisabledTasks = false,
}: { includeDisabledTasks?: boolean } = {}) {
  const leadsQuery = useQuery<LeadsListResponse>({
    queryKey: ["flow-2", "leads"],
    queryFn: () => api.leads({ slim: true }),
    staleTime: 30_000,
  })
  const { tasks, isPending: tasksPending, isError: tasksError } = useAiTasks()
  const { fields } = useFields()
  const jobsQuery = useJobs(["queued", "running"])

  const snapshot = useMemo<Flow2Snapshot | null>(() => {
    if (!leadsQuery.data) return null
    return buildLeadFlow2Snapshot({
      leads: leadsQuery.data.items,
      tasks,
      fields,
      jobs: jobsQuery.data ?? [],
      totalLeads: leadsQuery.data.total ?? leadsQuery.data.items.length,
      includeDisabledTasks,
    })
  }, [leadsQuery.data, tasks, fields, jobsQuery.data, includeDisabledTasks])

  return {
    snapshot,
    isPending: leadsQuery.isPending || tasksPending,
    isError: leadsQuery.isError || tasksError,
    error: leadsQuery.error,
    refetch: leadsQuery.refetch,
  }
}
