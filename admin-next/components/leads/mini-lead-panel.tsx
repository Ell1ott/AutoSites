"use client"

import * as React from "react"
import { useCallback, useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { AlertCircleIcon, Search01Icon, StarIcon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { FilterBuilder } from "@/components/filter/filter-builder"
import { LeadScreenshot } from "@/components/leads/lead-screenshot"
import { useFields } from "@/hooks/use-fields"
import { useLeads } from "@/hooks/use-leads"
import { applyFiltersAndSort } from "@/lib/filter"
import { MOCK_LEADS } from "@/lib/mock-leads"
import type { FilterClause, SlimLead } from "@/lib/types"
import { cn } from "@/lib/utils"

const USING_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1"

type Props = {
  /** Local selection state, NOT the global selection-pill store. */
  selectedIds: Set<string>
  onSelectionChange: (next: Set<string>) => void
  initialFilters?: FilterClause[]
  /** Override the height container class. Default `h-64`. */
  className?: string
  /**
   * Per-lead missing-dependency labels. Return an empty array when the lead
   * satisfies the current task's requirements; non-empty triggers a ⚠ in the
   * right-most cell whose tooltip lists each entry. When omitted, the cell
   * falls back to the legacy "no site" badge.
   */
  getMissing?: (lead: SlimLead) => string[]
}

/**
 * Compact embedded mini-CRM for picking test leads inside the task editor.
 * Composes the shared FilterBuilder + lead query cache used by /leads, but
 * keeps its own scoped selection state — it does NOT touch the global
 * selection-pill store.
 */
export function MiniLeadPanel({
  selectedIds,
  onSelectionChange,
  initialFilters,
  className,
  getMissing,
}: Props): React.JSX.Element {
  const [clauses, setClauses] = useState<FilterClause[]>(initialFilters ?? [])
  const [search, setSearch] = useState("")

  const leadsQuery = useLeads()
  const { fields } = useFields()

  const usingMockFallback = USING_MOCKS && leadsQuery.isError
  const rows: SlimLead[] = useMemo(() => {
    if (leadsQuery.data) return leadsQuery.data
    if (usingMockFallback) return MOCK_LEADS
    return []
  }, [leadsQuery.data, usingMockFallback])

  const combinedClauses = useMemo<FilterClause[]>(() => {
    const q = search.trim()
    if (!q) return clauses
    return [...clauses, { key: "name", op: "like", value: q }]
  }, [clauses, search])

  const filtered = useMemo<SlimLead[]>(
    () =>
      applyFiltersAndSort(
        rows as unknown as Array<Record<string, unknown>>,
        combinedClauses,
        undefined,
        fields.length > 0 ? fields : undefined,
      ) as unknown as SlimLead[],
    [rows, combinedClauses, fields],
  )

  // Scoped row-selection (matches use-row-selection.ts but writes to props).
  const lastClickedRef = useRef<string | null>(null)
  const toggleOne = useCallback(
    (id: string) => {
      const next = new Set(selectedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      onSelectionChange(next)
    },
    [selectedIds, onSelectionChange],
  )

  const addRange = useCallback(
    (fromId: string, toId: string) => {
      const ids = filtered.map((r) => r.place_id)
      const a = ids.indexOf(fromId)
      const b = ids.indexOf(toId)
      if (a === -1 || b === -1) {
        toggleOne(toId)
        return
      }
      const [lo, hi] = a < b ? [a, b] : [b, a]
      const next = new Set(selectedIds)
      for (let i = lo; i <= hi; i++) next.add(ids[i]!)
      onSelectionChange(next)
    },
    [filtered, selectedIds, onSelectionChange, toggleOne],
  )

  const onRowClick = useCallback(
    (
      placeId: string,
      e: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean },
    ) => {
      const last = lastClickedRef.current
      if (e.shiftKey && last && last !== placeId) {
        addRange(last, placeId)
        lastClickedRef.current = placeId
        return
      }
      toggleOne(placeId)
      lastClickedRef.current = placeId
    },
    [addRange, toggleOne],
  )

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((r) => selectedIds.has(r.place_id))

  function selectAllVisible() {
    const next = new Set(selectedIds)
    for (const r of filtered) next.add(r.place_id)
    onSelectionChange(next)
  }

  function clearSelection() {
    onSelectionChange(new Set())
  }

  const isLoading = leadsQuery.isPending && !usingMockFallback
  const hardError = leadsQuery.isError && !usingMockFallback

  return (
    <div className="flex flex-col gap-2">
      {/* Filter strip + search */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <FilterBuilder
            clauses={clauses}
            onChange={setClauses}
            compact
            fields={fields.length > 0 ? fields : undefined}
          />
        </div>
        <div className="flex items-center gap-1.5 rounded-md border bg-input/30 px-2">
          <HugeiconsIcon
            icon={Search01Icon}
            size={12}
            strokeWidth={1.5}
            className="text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="h-7 w-36 border-0 bg-transparent px-0 text-[12px] shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      {usingMockFallback ? (
        <p className="text-[11px] text-yellow-600 dark:text-yellow-500">
          Backend offline — using mocks (NEXT_PUBLIC_USE_MOCKS=1).
        </p>
      ) : null}

      {/* List */}
      <div
        className={cn(
          "overflow-y-auto rounded-md border bg-card",
          className ?? "h-64",
        )}
      >
        {isLoading ? (
          <div className="flex flex-col gap-1 p-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-7 animate-pulse rounded-sm bg-muted/40"
              />
            ))}
          </div>
        ) : hardError ? (
          <div className="flex h-full items-center justify-center text-[12px] text-muted-foreground">
            Couldn&apos;t load leads.
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[12px] text-muted-foreground">
            {rows.length === 0
              ? "No leads."
              : "No leads match these filters."}
          </div>
        ) : (
          <table className="w-full table-fixed border-collapse text-[12px]">
            <colgroup>
              <col style={{ width: 26 }} />
              <col style={{ width: 36 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 44 }} />
              <col style={{ width: 44 }} />
              <col style={{ width: 38 }} />
            </colgroup>
            <tbody>
              {filtered.map((lead) => {
                const isSelected = selectedIds.has(lead.place_id)
                return (
                  <tr
                    key={lead.place_id}
                    onClick={(e) =>
                      onRowClick(lead.place_id, {
                        shiftKey: e.shiftKey,
                        metaKey: e.metaKey,
                        ctrlKey: e.ctrlKey,
                      })
                    }
                    className={cn(
                      "h-7 cursor-pointer border-b border-border/40 transition-colors",
                      isSelected ? "bg-accent/60" : "hover:bg-muted/30",
                    )}
                  >
                    <td className="px-1.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        aria-label={`Select ${lead.name}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          onRowClick(lead.place_id, {
                            shiftKey: e.shiftKey,
                            metaKey: e.metaKey,
                            ctrlKey: e.ctrlKey,
                          })
                        }}
                      />
                    </td>
                    <td className="px-1">
                      <LeadScreenshot
                        lead={lead}
                        className="h-4 w-6 rounded-sm border border-border"
                      />
                    </td>
                    <td className="truncate px-2 font-medium">{lead.name}</td>
                    <td className="px-1 text-right tabular-nums">
                      {lead.lead_score != null ? (
                        <span className="inline-flex items-center gap-0.5 text-[11px]">
                          <HugeiconsIcon
                            icon={StarIcon}
                            size={9}
                            strokeWidth={1.5}
                          />
                          {lead.lead_score}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-1 text-right tabular-nums text-[11px]">
                      {lead.rating != null ? (
                        lead.rating.toFixed(1)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-1 text-right">
                      {(() => {
                        const missing = getMissing ? getMissing(lead) : null
                        if (missing && missing.length > 0) {
                          return (
                            <TooltipProvider delayDuration={150}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex h-4 w-4 cursor-help items-center justify-center text-amber-600 dark:text-amber-400"
                                    aria-label={`Missing: ${missing.join(", ")}`}
                                  >
                                    <HugeiconsIcon
                                      icon={AlertCircleIcon}
                                      size={12}
                                      strokeWidth={1.75}
                                    />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  <div className="flex flex-col gap-0.5 text-left">
                                    <span className="font-medium">
                                      Missing inputs
                                    </span>
                                    <ul className="list-disc pl-3.5">
                                      {missing.map((m) => (
                                        <li key={m}>{m}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                        }
                        if (!getMissing && !lead.website) {
                          return (
                            <span className="text-[10px] uppercase text-destructive">
                              no site
                            </span>
                          )
                        }
                        return null
                      })()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 text-[12px]">
        <span className="text-muted-foreground">
          {selectedIds.size} of {filtered.length} selected
        </span>
        <span className="flex-1" />
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={selectAllVisible}
          disabled={filtered.length === 0 || allVisibleSelected}
        >
          Select all visible
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={clearSelection}
          disabled={selectedIds.size === 0}
        >
          Clear
        </Button>
      </div>
    </div>
  )
}
