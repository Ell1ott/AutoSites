"use client"

import { useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"

import { LeadDetail } from "@/components/leads/lead-detail"
import { useUiStore } from "@/lib/store/ui"

export function LeadDetailPageClient({ id }: { id: string }) {
  const router = useRouter()
  const setSelectedLeadId = useUiStore((s) => s.setSelectedLeadId)
  const setLeadDetailFullScreen = useUiStore((s) => s.setLeadDetailFullScreen)

  useEffect(() => {
    setSelectedLeadId(id)
    setLeadDetailFullScreen(true)
  }, [id, setSelectedLeadId, setLeadDetailFullScreen])

  const onClose = useCallback(() => {
    setLeadDetailFullScreen(false)
    router.push("/leads")
  }, [router, setLeadDetailFullScreen])

  return <LeadDetail placeId={id} onClose={onClose} />
}
