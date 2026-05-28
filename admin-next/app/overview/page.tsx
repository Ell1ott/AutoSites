"use client"

import { useMemo } from "react"

import { OverviewDashboard } from "@/components/overview/overview-dashboard"
import { Button } from "@/components/ui/button"
import { useFields } from "@/hooks/use-fields"
import { useLeads } from "@/hooks/use-leads"
import { MOCK_LEADS } from "@/lib/mock-leads"
import type { SlimLead } from "@/lib/types"

const USING_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1"

export default function OverviewPage() {
  const leadsQuery = useLeads()
  const { fields } = useFields()

  const usingMockFallback = USING_MOCKS && leadsQuery.isError
  const rows: SlimLead[] = useMemo(() => {
    if (leadsQuery.data) return leadsQuery.data
    if (usingMockFallback) return MOCK_LEADS
    return []
  }, [leadsQuery.data, usingMockFallback])

  const isLoading = leadsQuery.isPending && !usingMockFallback
  const hardError = leadsQuery.isError && !usingMockFallback

  if (hardError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-12 text-center">
        <p className="text-[13px] text-foreground">
          Couldn&apos;t load overview. {leadsQuery.error.message}
        </p>
        <p className="text-[12px] text-muted-foreground">
          Backend at NEXT_PUBLIC_PI_URL reachable?
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => leadsQuery.refetch()}
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <>
      {usingMockFallback && (
        <div className="border-b border-yellow-500/20 bg-yellow-500/10 px-6 py-1.5 text-[12px] text-yellow-500">
          Showing mock data — backend unreachable (NEXT_PUBLIC_USE_MOCKS=1).
        </div>
      )}
      <OverviewDashboard rows={rows} fields={fields} isLoading={isLoading} />
    </>
  )
}
