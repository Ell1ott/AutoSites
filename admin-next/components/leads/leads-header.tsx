"use client"

import { useMemo } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  GridViewIcon,
  Layout01Icon,
  MapsLocation01Icon,
  Search01Icon,
  Table01Icon,
} from "@hugeicons/core-free-icons"

import {
  fieldFilterClauses,
  LocationFilterChip,
} from "@/components/filter/location-filter-chip"
import { FilterBuilder } from "@/components/filter/filter-builder"
import { setLocationFilter, extractLocationFilter } from "@/lib/location-filter"
import { LeadQuickFilters } from "@/components/leads/lead-quick-filters"
import { LeadTableColumnsMenu } from "@/components/leads/lead-table-columns-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFields } from "@/hooks/use-fields"
import { isComparableLeadField } from "@/lib/field-descriptors"
import { getMapColorOptions } from "@/lib/lead-map-color"
import type { LeadsViewMode } from "@/lib/store/ui"
import { useUiStore } from "@/lib/store/ui"
import {
  fieldClauseKey,
  type FilterClause,
  type SortClause,
} from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  filteredCount: number
  totalCount: number
  clauses: FilterClause[]
  onClausesChange: (next: FilterClause[]) => void
  sort?: SortClause
  onSortChange: (next?: SortClause) => void
  view: LeadsViewMode
  onViewChange: (v: LeadsViewMode) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  /** When table view: show column visibility next to sort controls. */
  showTableColumnsMenu?: boolean
  mapColorField?: string
  onMapColorFieldChange?: (key: string) => void
  mapPointsCount?: number
  mapMissingCount?: number
}

const VIEW_BUTTONS: Array<{
  value: LeadsViewMode
  label: string
  icon: typeof GridViewIcon
}> = [
  { value: "smallGrid", label: "Small grid", icon: GridViewIcon },
  { value: "bigGrid", label: "Big grid", icon: Layout01Icon },
  { value: "table", label: "Table", icon: Table01Icon },
  { value: "map", label: "Map", icon: MapsLocation01Icon },
]

export function LeadsHeader({
  filteredCount,
  totalCount,
  clauses,
  onClausesChange,
  sort,
  onSortChange,
  view,
  onViewChange,
  searchQuery,
  onSearchChange,
  showTableColumnsMenu = false,
  mapColorField,
  onMapColorFieldChange,
  mapPointsCount,
  mapMissingCount,
}: Props) {
  const { fields } = useFields()
  const mapColorOptions = useMemo(() => getMapColorOptions(fields), [fields])
  const sortableFields = useMemo(() => {
    // Only stable columns + scalar dynamic fields. Filter out object/array.
    return fields
      .filter(isComparableLeadField)
      .map((f) => ({
        key: fieldClauseKey(f),
        label:
          f.display && f.display.trim() !== "" ? f.display : f.key,
      }))
  }, [fields])

  const sortKey = sort?.key ?? ""
  const sortDir = sort?.dir ?? "asc"
  const showFlowColumns = useUiStore((s) => s.leadTableShowFlowColumns)
  const setShowFlowColumns = useUiStore((s) => s.setLeadTableShowFlowColumns)
  const fieldClauses = useMemo(() => fieldFilterClauses(clauses), [clauses])

  function onFieldClausesChange(next: FilterClause[]) {
    onClausesChange(setLocationFilter(next, extractLocationFilter(clauses)))
  }

  return (
    <div className="flex flex-col gap-3 border-b border-border bg-background px-4 py-3">
      {/* Row 1: title + count, view toggle + search */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[16px] font-semibold tracking-tight text-foreground">
            Leads
          </h1>
          <span className="inline-flex h-5 items-center rounded-full bg-muted px-2 text-[11px] font-medium tabular-nums text-muted-foreground">
            {filteredCount === totalCount
              ? `${totalCount} ${totalCount === 1 ? "lead" : "leads"}`
              : `${filteredCount} of ${totalCount}`}
            {view === "map" &&
              mapPointsCount != null &&
              mapMissingCount != null &&
              mapMissingCount > 0 && (
                <>
                  {" "}
                  · {mapPointsCount} on map · {mapMissingCount} without location
                </>
              )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div
            role="tablist"
            aria-label="View mode"
            className="inline-flex h-8 items-center rounded-lg border border-border bg-muted/70 p-0.5"
          >
            {VIEW_BUTTONS.map((b) => {
              const active = view === b.value
              return (
                <button
                  key={b.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onViewChange(b.value)}
                  title={b.label}
                  className={cn(
                    "inline-flex h-7 w-8 items-center justify-center rounded-md transition-all duration-200",
                    active
                      ? "bg-card text-primary shadow-[var(--shadow-card)]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <HugeiconsIcon
                    icon={b.icon}
                    size={14}
                    strokeWidth={1.75}
                  />
                </button>
              )
            })}
          </div>

          <div className="relative">
            <HugeiconsIcon
              icon={Search01Icon}
              size={14}
              strokeWidth={1.5}
              className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search leads…"
              className="h-8 w-56 rounded-md pl-7 text-[13px]"
            />
          </div>
        </div>
      </div>

      {/* Row 2: quick filters + filter builder + sort (one line when space allows) */}
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-x-3 gap-y-2">
          <div className="shrink-0">
            <LeadQuickFilters
              clauses={clauses}
              onClausesChange={onClausesChange}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <LocationFilterChip
                clauses={clauses}
                onClausesChange={onClausesChange}
              />
              <FilterBuilder
                clauses={fieldClauses}
                onChange={onFieldClausesChange}
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {view === "map" && mapColorField && onMapColorFieldChange && (
            <>
              <span className="text-[11px] text-muted-foreground">Color by</span>
              <Select
                value={mapColorField}
                onValueChange={onMapColorFieldChange}
              >
                <SelectTrigger
                  size="sm"
                  className="h-8 w-44 rounded-md text-[12px]"
                >
                  <SelectValue placeholder="Lead score" />
                </SelectTrigger>
                <SelectContent>
                  {mapColorOptions.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          <span className="text-[11px] text-muted-foreground">Sort by</span>
          <Select
            value={sortKey || "__none__"}
            onValueChange={(v) => {
              if (v === "__none__") onSortChange(undefined)
              else onSortChange({ key: v, dir: sortDir })
            }}
          >
            <SelectTrigger
              size="sm"
              className="h-8 w-40 rounded-md text-[12px]"
            >
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— None —</SelectItem>
              {sortableFields.map((f) => (
                <SelectItem key={f.key} value={f.key}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {sort && (
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="h-8 w-8 rounded-md"
              aria-label={
                sortDir === "asc" ? "Sort ascending" : "Sort descending"
              }
              onClick={() =>
                onSortChange({
                  key: sort.key,
                  dir: sortDir === "asc" ? "desc" : "asc",
                })
              }
            >
              <HugeiconsIcon
                icon={sortDir === "asc" ? ArrowUp01Icon : ArrowDown01Icon}
                size={12}
                strokeWidth={2}
              />
            </Button>
          )}
          {showTableColumnsMenu ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={showFlowColumns}
                onClick={() => setShowFlowColumns(!showFlowColumns)}
                className={cn(
                  "h-8 rounded-md px-2.5 text-[12px] font-medium",
                  showFlowColumns &&
                    "border-primary/40 bg-primary/10 text-primary shadow-[var(--shadow-card)]",
                )}
              >
                AI flow
              </Button>
              <LeadTableColumnsMenu />
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
