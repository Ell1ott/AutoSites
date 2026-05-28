"use client"

import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { MoreHorizontalIcon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DEFAULT_QUICK_FILTERS,
  MIN_RATING_OPTIONS,
  MIN_REVIEW_OPTIONS,
  mergeQuickFilters,
  parseQuickFiltersFromClauses,
  isQuickFilterActive,
  type CrawlQuick,
  type LeadQuickFiltersState,
  type OpenNowQuick,
  type WebsiteQuick,
} from "@/lib/lead-quick-filters"
import type { FilterClause } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  clauses: FilterClause[]
  onClausesChange: (next: FilterClause[]) => void
}

const SCORE_GT = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] as const

function Toggle3<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T
  onChange: (v: T) => void
  options: Array<{ value: T; label: string; title?: string }>
  ariaLabel: string
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex h-8 items-center rounded-md border border-border bg-card p-0.5"
    >
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            title={o.title ?? o.label}
            className={cn(
              "rounded-sm px-2 py-1 text-[11px] font-medium transition-colors",
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function LeadQuickFilters({ clauses, onClausesChange }: Props) {
  const quick = useMemo(
    () => parseQuickFiltersFromClauses(clauses),
    [clauses],
  )

  const [moreOpen, setMoreOpen] = useState(false)

  const secondaryActive =
    quick.crawl !== "all" ||
    quick.minRating !== "any" ||
    quick.minReviewCount !== "any" ||
    quick.leadScoreGt !== "any" ||
    quick.openNow !== "all"

  function patch(partial: Partial<LeadQuickFiltersState>) {
    const next: LeadQuickFiltersState = { ...quick, ...partial }
    onClausesChange(mergeQuickFilters(clauses, next))
  }

  function clearQuick() {
    onClausesChange(mergeQuickFilters(clauses, DEFAULT_QUICK_FILTERS))
  }

  return (
    <div
      className="flex flex-wrap items-end gap-x-4 gap-y-2"
      aria-label="Quick filters"
    >
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-muted-foreground">
          Website
        </span>
        <Toggle3<WebsiteQuick>
          ariaLabel="Website"
          value={quick.website}
          onChange={(website) => patch({ website })}
          options={[
            { value: "all", label: "All" },
            { value: "with", label: "With" },
            { value: "without", label: "Without" },
          ]}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-muted-foreground">
          Crawl
        </span>
        <Toggle3<CrawlQuick>
          ariaLabel="Crawl pages"
          value={quick.crawl}
          onChange={(crawl) => patch({ crawl })}
          options={[
            { value: "all", label: "All", title: "Any crawl data" },
            {
              value: "multi",
              label: "2+",
              title: "At least two crawled subpages",
            },
            {
              value: "none",
              label: "Not 2+",
              title: "Fewer than two crawled subpages",
            },
          ]}
        />
      </div>

      <div className="relative flex flex-col gap-1">
        <span
          className={cn(
            "text-[11px] font-medium",
            secondaryActive || moreOpen
              ? "text-foreground"
              : "text-muted-foreground",
          )}
        >
          More
        </span>
        <Popover open={moreOpen} onOpenChange={setMoreOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "h-8 w-10 p-0",
                secondaryActive && !moreOpen
                  ? "border-primary/40 bg-primary/5"
                  : undefined,
              )}
              aria-expanded={moreOpen}
              aria-label="More filters"
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} size={16} strokeWidth={2} />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="z-[100] w-[min(100vw-2rem,21rem)] gap-3 rounded-3xl p-3"
          >
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                Min rating
              </span>
              <Select
                value={quick.minRating}
                onValueChange={(minRating) =>
                  patch({
                    minRating: minRating as LeadQuickFiltersState["minRating"],
                  })
                }
              >
                <SelectTrigger size="sm" className="h-8 w-full text-[12px]">
                  <SelectValue placeholder="Min rating" />
                </SelectTrigger>
                <SelectContent className="z-[120]">
                  <SelectItem value="any">Any</SelectItem>
                  {MIN_RATING_OPTIONS.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}+ stars
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                Review count
              </span>
              <Select
                value={quick.minReviewCount}
                onValueChange={(minReviewCount) =>
                  patch({
                    minReviewCount:
                      minReviewCount as LeadQuickFiltersState["minReviewCount"],
                  })
                }
              >
                <SelectTrigger size="sm" className="h-8 w-full text-[12px]">
                  <SelectValue placeholder="Reviews" />
                </SelectTrigger>
                <SelectContent className="z-[120]">
                  <SelectItem value="any">Any</SelectItem>
                  {MIN_REVIEW_OPTIONS.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}+ reviews
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                Score &gt;
              </span>
              <Select
                value={quick.leadScoreGt}
                onValueChange={(leadScoreGt) =>
                  patch({
                    leadScoreGt:
                      leadScoreGt as LeadQuickFiltersState["leadScoreGt"],
                  })
                }
              >
                <SelectTrigger size="sm" className="h-8 w-full text-[12px]">
                  <SelectValue placeholder="Lead score" />
                </SelectTrigger>
                <SelectContent className="z-[120]">
                  <SelectItem value="any">Any</SelectItem>
                  {SCORE_GT.map((n) => (
                    <SelectItem key={n} value={n}>
                      &gt; {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                Open now
              </span>
              <Toggle3<OpenNowQuick>
                ariaLabel="Open now"
                value={quick.openNow}
                onChange={(openNow) => patch({ openNow })}
                options={[
                  { value: "all", label: "All" },
                  { value: "open", label: "Open" },
                  { value: "closed", label: "Closed" },
                ]}
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 h-8 self-start text-[12px] text-muted-foreground"
              onClick={() => {
                patch({
                  crawl: "all",
                  minRating: "any",
                  minReviewCount: "any",
                  leadScoreGt: "any",
                  openNow: "all",
                })
              }}
            >
              Reset more filters
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      {isQuickFilterActive(quick) ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 self-end text-[12px] text-muted-foreground"
          onClick={clearQuick}
        >
          Clear quick
        </Button>
      ) : null}
    </div>
  )
}
