"use client"

import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import { MOCK_JOBS } from "@/lib/mock-jobs"
import type { Job, JobStatus } from "@/lib/types"

function shouldUseMocks(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCKS === "1"
}

function filterMockJobs(status?: JobStatus | JobStatus[]): Job[] {
  if (!status) return MOCK_JOBS
  const statuses = Array.isArray(status) ? status : [status]
  return MOCK_JOBS.filter((j) => statuses.includes(j.status))
}

/**
 * List jobs filtered by status. Adaptive polling: 2s while any job is
 * running/queued, 5s otherwise.
 */
export function useJobs(status?: JobStatus | JobStatus[]) {
  return useQuery<Job[]>({
    queryKey: ["jobs", status ?? "all"],
    queryFn: async () => {
      try {
        return await api.jobs({ status })
      } catch (err) {
        if (shouldUseMocks()) {
          return filterMockJobs(status)
        }
        throw err
      }
    },
    refetchInterval: (q) => {
      const data = q.state.data as Job[] | undefined
      const anyActive = data?.some(
        (j) => j.status === "running" || j.status === "queued",
      )
      return anyActive ? 2000 : 5000
    },
    refetchIntervalInBackground: false,
  })
}

/** Convenience: number of jobs that are queued or running right now. */
export function useActiveJobCount(): number {
  const { data } = useJobs(["running", "queued"])
  return data?.length ?? 0
}
