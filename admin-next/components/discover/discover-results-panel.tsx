"use client"

import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import type { DiscoverResultRef } from "@/lib/discover-map-leads"
import { cn } from "@/lib/utils"

type Props = {
  results: DiscoverResultRef[]
  selectedLeadId?: string | null
  onSelect?: (placeId: string) => void
  className?: string
}

export function DiscoverResultsPanel({
  results,
  selectedLeadId,
  onSelect,
  className,
}: Props) {
  if (results.length === 0) return null

  return (
    <div
      className={cn(
        "bg-popover/95 text-popover-foreground pointer-events-auto absolute top-3 right-3 z-[1]",
        "flex w-[min(calc(100%-1.5rem),280px)] max-h-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-lg border border-border shadow-md backdrop-blur-sm",
        className,
      )}
    >
      <div className="border-border flex shrink-0 items-center justify-between border-b px-3 py-2">
        <span className="text-[12px] font-medium">Results</span>
        <Badge variant="secondary" className="font-mono text-[10px]">
          {results.length}
        </Badge>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <ul className="flex flex-col gap-0.5 p-1.5">
          {results.map((r) => {
            const hasCoords = r.lat != null && r.lng != null
            const selected = selectedLeadId === r.placeId
            return (
              <li key={r.placeId}>
                <button
                  type="button"
                  onClick={() => onSelect?.(r.placeId)}
                  className={cn(
                    "hover:bg-accent/50 flex w-full min-w-0 flex-col items-start gap-1 rounded-md px-2.5 py-2 text-left transition-colors",
                    selected && "bg-accent/70 ring-1 ring-ring/40",
                  )}
                >
                  <span className="w-full truncate text-[12px] font-medium leading-snug">
                    {r.name ?? r.placeId}
                  </span>
                  <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                    {r.isNew ? (
                      <Badge variant="default" className="h-4 shrink-0 px-1.5 text-[10px]">
                        New
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="h-4 shrink-0 px-1.5 text-[10px]">
                        Updated
                      </Badge>
                    )}
                    {!hasCoords && (
                      <span className="text-muted-foreground truncate text-[10px]">
                        No location
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="border-border shrink-0 border-t px-3 py-2">
        <Link href="/leads" className="text-primary text-[11px] hover:underline">
          Open all leads →
        </Link>
      </div>
    </div>
  )
}
