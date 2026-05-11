"use client"

import { useMemo } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  GridViewIcon,
  Layout01Icon,
  Search01Icon,
  Table01Icon,
} from "@hugeicons/core-free-icons"

import { FilterBuilder } from "@/components/filter/filter-builder"
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
import type { LeadsViewMode } from "@/lib/store/ui"
import type { FilterClause, SortClause } from "@/lib/types"
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
}

const VIEW_BUTTONS: Array<{
  value: LeadsViewMode
  label: string
  icon: typeof GridViewIcon
}> = [
  { value: "smallGrid", label: "Small grid", icon: GridViewIcon },
  { value: "bigGrid", label: "Big grid", icon: Layout01Icon },
  { value: "table", label: "Table", icon: Table01Icon },
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
}: Props) {
  const { fields } = useFields()
  const sortableFields = useMemo(() => {
    // Only stable columns + scalar dynamic fields. Filter out object/array.
    return fields
      .filter((f) => !f.type.startsWith("array") && f.type !== "object")
      .map((f) => ({
        key: f.source === "dynamic" ? `dynamic.${f.key}` : f.key,
        label:
          f.display && f.display.trim() !== "" ? f.display : f.key,
      }))
  }, [fields])

  const sortKey = sort?.key ?? ""
  const sortDir = sort?.dir ?? "asc"

  return (
    <div className="flex flex-col gap-3 border-b border-border bg-background px-4 py-3">
      {/* Row 1: title + count, view toggle + search */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-[15px] font-semibold text-foreground">
            Lead overview
          </h1>
          <span className="text-[12px] text-muted-foreground">
            {filteredCount === totalCount
              ? `${totalCount} ${totalCount === 1 ? "lead" : "leads"}`
              : `${filteredCount} of ${totalCount} leads`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div
            role="tablist"
            aria-label="View mode"
            className="inline-flex h-8 items-center rounded-md border border-border bg-card p-0.5"
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
                    "inline-flex h-7 w-8 items-center justify-center rounded-sm text-muted-foreground transition-colors",
                    active
                      ? "bg-accent text-foreground"
                      : "hover:bg-accent/40 hover:text-foreground",
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

      {/* Row 2: filters + sort */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <FilterBuilder clauses={clauses} onChange={onClausesChange} />
        </div>

        <div className="flex items-center gap-1.5">
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
        </div>
      </div>
    </div>
  )
}
