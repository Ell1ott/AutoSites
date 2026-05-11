"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  StarIcon,
} from "@hugeicons/core-free-icons"

import { Checkbox } from "@/components/ui/checkbox"
import { useFields } from "@/hooks/use-fields"
import { readField } from "@/lib/filter"
import { useSelectionStore } from "@/lib/store/selection"
import type { FieldDescriptor, SlimLead, SortClause } from "@/lib/types"
import { cn } from "@/lib/utils"

import { LeadScreenshot } from "./lead-screenshot"
import { useRowSelection } from "./use-row-selection"

type Props = {
  rows: SlimLead[]
  sort?: SortClause
  onSortChange: (next?: SortClause) => void
}

// Static column descriptors for the fixed top-level fields. Extra dynamic
// columns are appended after this list.
const STATIC_COLUMNS: Array<{
  key: string
  label: string
  className?: string
  align?: "left" | "right"
}> = [
  { key: "name", label: "Name" },
  { key: "lead_score", label: "Score", align: "right" },
  { key: "rating", label: "Rating", align: "right" },
  { key: "review_count", label: "Reviews", align: "right" },
  { key: "website", label: "Site" },
]

function displayLabel(f: FieldDescriptor): string {
  return f.display && f.display.trim() !== "" ? f.display : f.key
}

function renderCell(lead: SlimLead, key: string): React.ReactNode {
  if (key === "website") {
    return lead.website ? (
      <span className="text-[11px] text-muted-foreground">yes</span>
    ) : (
      <span className="text-[11px] text-destructive">no</span>
    )
  }
  if (key === "lead_score") {
    if (lead.lead_score == null) return <span className="text-muted-foreground">—</span>
    return (
      <span className="inline-flex items-center gap-0.5 font-medium tabular-nums">
        <HugeiconsIcon icon={StarIcon} size={10} strokeWidth={1.5} />
        {lead.lead_score}
      </span>
    )
  }
  if (key === "rating") {
    return lead.rating != null ? (
      <span className="tabular-nums">{lead.rating}</span>
    ) : (
      <span className="text-muted-foreground">—</span>
    )
  }
  if (key === "review_count") {
    return lead.review_count != null ? (
      <span className="tabular-nums">{lead.review_count}</span>
    ) : (
      <span className="text-muted-foreground">—</span>
    )
  }
  if (key === "name") {
    return <span className="font-medium text-foreground">{lead.name}</span>
  }
  // Dynamic / pass-through.
  const v = readField(lead as unknown as Record<string, unknown>, key)
  if (v === undefined || v === null || v === "") {
    return <span className="text-muted-foreground">—</span>
  }
  if (typeof v === "boolean") return v ? "yes" : "no"
  if (Array.isArray(v)) {
    return (
      <span className="line-clamp-1 text-[11px] text-muted-foreground">
        {v.map((x) => String(x)).join(", ")}
      </span>
    )
  }
  if (typeof v === "object") {
    return <span className="text-[11px] text-muted-foreground">{"{…}"}</span>
  }
  return <span className="line-clamp-1">{String(v)}</span>
}

export function LeadTable({ rows, sort, onSortChange }: Props) {
  const router = useRouter()
  const selected = useSelectionStore((s) => s.selected)
  const { onCheckboxClick } = useRowSelection(rows)
  const { fields } = useFields()

  // Pick top 2 dynamic columns by coverage. Excludes known long-text/object
  // fields so the table stays narrow.
  const dynamicCols = useMemo(() => {
    const banned = new Set([
      "design_prompt",
      "summary",
      "ai_summary",
      "description",
      "screenshot_path",
    ])
    const candidates = fields
      .filter((f) => f.source === "dynamic")
      .filter((f) => !banned.has(f.key))
      .filter((f) => f.type !== "object")
      .filter((f) => !f.type.startsWith("array"))
      .sort((a, b) => b.coverage - a.coverage)
    return candidates.slice(0, 2)
  }, [fields])

  function clickHeader(key: string) {
    if (!sort || sort.key !== key) {
      onSortChange({ key, dir: "asc" })
      return
    }
    if (sort.dir === "asc") {
      onSortChange({ key, dir: "desc" })
      return
    }
    onSortChange(undefined)
  }

  function headerCell(
    key: string,
    label: string,
    align: "left" | "right" = "left",
  ) {
    const active = sort?.key === key
    return (
      <th
        key={key}
        scope="col"
        onClick={() => clickHeader(key)}
        className={cn(
          "select-none truncate border-b border-border px-2 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground",
          "cursor-pointer",
          align === "right" && "text-right",
        )}
      >
        <span
          className={cn(
            "inline-flex items-center gap-1",
            align === "right" && "flex-row-reverse",
            active && "text-foreground",
          )}
        >
          {label}
          {active && (
            <HugeiconsIcon
              icon={sort?.dir === "desc" ? ArrowDown01Icon : ArrowUp01Icon}
              size={10}
              strokeWidth={2}
            />
          )}
        </span>
      </th>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full table-fixed border-collapse text-[13px]">
        <colgroup>
          <col style={{ width: 32 }} />
          <col style={{ width: 56 }} />
          <col />
          <col style={{ width: 64 }} />
          <col style={{ width: 64 }} />
          <col style={{ width: 72 }} />
          <col style={{ width: 56 }} />
          {dynamicCols.map((c) => (
            <col key={c.key} style={{ width: 140 }} />
          ))}
        </colgroup>
        <thead className="bg-background sticky top-0 z-10">
          <tr>
            <th
              scope="col"
              className="border-b border-border px-2 py-1.5"
              aria-label="select all"
            />
            <th
              scope="col"
              className="border-b border-border px-2 py-1.5"
              aria-label="screenshot"
            />
            {STATIC_COLUMNS.map((c) =>
              headerCell(c.key, c.label, c.align ?? "left"),
            )}
            {dynamicCols.map((c) =>
              headerCell(c.key, displayLabel(c), "left"),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((lead) => {
            const isSelected = selected.has(lead.place_id)
            return (
              <tr
                key={lead.place_id}
                onClick={() => router.push(`/leads/${lead.place_id}`)}
                className={cn(
                  "group/row h-9 cursor-pointer border-b border-border/60 transition-colors",
                  isSelected ? "bg-accent/50" : "hover:bg-muted/30",
                )}
              >
                <td
                  className="px-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={isSelected}
                    aria-label={`Select ${lead.name}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onCheckboxClick(lead.place_id, e)
                    }}
                  />
                </td>
                <td className="px-2">
                  <LeadScreenshot
                    lead={lead}
                    className="h-[26px] w-10 rounded-sm border border-border"
                  />
                </td>
                {STATIC_COLUMNS.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "truncate px-2",
                      c.align === "right" && "text-right",
                    )}
                  >
                    {renderCell(lead, c.key)}
                  </td>
                ))}
                {dynamicCols.map((c) => (
                  <td key={c.key} className="truncate px-2">
                    {renderCell(
                      lead,
                      c.source === "dynamic" ? `dynamic.${c.key}` : c.key,
                    )}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
