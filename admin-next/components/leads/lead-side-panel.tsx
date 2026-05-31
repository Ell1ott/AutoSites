"use client"

import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowExpand02Icon, Cancel01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { useUiStore } from "@/lib/store/ui"

import { LeadDetail } from "./lead-detail"

type Props = {
  placeId: string
  onClose: () => void
}

export function LeadSidePanel({ placeId, onClose }: Props) {
  const setLeadDetailFullScreen = useUiStore((s) => s.setLeadDetailFullScreen)

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-border bg-surface-1">
      <div className="glass-header flex items-center justify-end gap-1 border-b border-border px-2 py-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              asChild
              aria-label="Open full page"
            >
              <Link
                href={`/leads/${placeId}`}
                onClick={() => setLeadDetailFullScreen(true)}
              >
                <HugeiconsIcon
                  icon={ArrowExpand02Icon}
                  size={16}
                  strokeWidth={1.75}
                />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open full page</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.75} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Close</TooltipContent>
        </Tooltip>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <LeadDetail placeId={placeId} onClose={onClose} hideClose compact />
      </div>
    </aside>
  )
}
