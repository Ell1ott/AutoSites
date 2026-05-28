"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { GlobeXIcon, StarIcon } from "@hugeicons/core-free-icons"

import { Checkbox } from "@/components/ui/checkbox"
import { useSelectionStore } from "@/lib/store/selection"
import type { SlimLead } from "@/lib/types"
import { cn } from "@/lib/utils"

import { LeadScreenshot } from "./lead-screenshot"
import { useRowSelection } from "./use-row-selection"

type Props = {
  rows: SlimLead[]
  onSelect: (placeId: string) => void
  selectedId: string | null
}

export function LeadGridSmall({ rows, onSelect, selectedId }: Props) {
  const selected = useSelectionStore((s) => s.selected)
  const { onCheckboxClick } = useRowSelection(rows)

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 p-4">
      {rows.map((lead) => {
        const isSelected = selected.has(lead.place_id)
        const isActive = selectedId === lead.place_id
        const score = lead.lead_score
        const noWebsite = !lead.website
        return (
          <div
            key={lead.place_id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(lead.place_id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSelect(lead.place_id)
            }}
            className={cn(
              "group/card relative flex flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground transition-all",
              "hover:ring-1 hover:ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              isSelected && "ring-2 ring-primary",
              isActive && "ring-2 ring-primary",
            )}
          >
            <LeadScreenshot
              lead={lead}
              className="aspect-[16/10] w-full border-b border-border"
            />

            {/* Checkbox — hover-revealed unless already selected. */}
            <div
              className={cn(
                "absolute top-2 left-2 transition-opacity",
                isSelected
                  ? "opacity-100"
                  : "opacity-0 group-hover/card:opacity-100 focus-within:opacity-100",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={isSelected}
                onClick={(e) => {
                  e.stopPropagation()
                  onCheckboxClick(lead.place_id, e)
                }}
                aria-label={`Select ${lead.name}`}
                className="bg-background/90 backdrop-blur-sm"
              />
            </div>

            {/* Rating chip (top-right of hero). */}
            {score != null && (
              <div className="absolute top-2 right-2 inline-flex h-5 items-center gap-0.5 rounded-full bg-foreground/85 px-1.5 text-[11px] font-medium text-background">
                <HugeiconsIcon
                  icon={StarIcon}
                  size={10}
                  strokeWidth={2}
                />
                {score}
              </div>
            )}

            <div className="flex flex-col gap-1 p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="line-clamp-1 text-sm font-medium text-foreground">
                  {lead.name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {lead.rating != null && (
                  <span className="inline-flex items-center gap-0.5">
                    <HugeiconsIcon
                      icon={StarIcon}
                      size={10}
                      strokeWidth={1.5}
                    />
                    {lead.rating}
                  </span>
                )}
                {lead.review_count != null && (
                  <span>({lead.review_count})</span>
                )}
                {noWebsite && (
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-destructive/10 px-1 text-[10px] text-destructive">
                    <HugeiconsIcon
                      icon={GlobeXIcon}
                      size={10}
                      strokeWidth={1.5}
                    />
                    no site
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
