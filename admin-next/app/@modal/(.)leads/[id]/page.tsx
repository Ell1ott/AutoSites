"use client"

import { use } from "react"
import { useRouter } from "next/navigation"

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { LeadDetail } from "@/components/leads/lead-detail"

type Params = { id: string }

export default function InterceptedLeadDetail({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = use(params)
  const router = useRouter()

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) router.back()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex h-[95vh] !w-[95vw] !max-w-[95vw] flex-col overflow-hidden !p-0"
      >
        <DialogTitle className="sr-only">Lead detail</DialogTitle>
        <div className="flex-1 overflow-auto px-6 py-4">
          <LeadDetail placeId={id} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
