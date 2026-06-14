"use client"

import { Menu01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMemo } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useFields } from "@/hooks/use-fields"
import { useUiStore } from "@/lib/store/ui"
import { fieldClauseKey, type FieldDescriptor } from "@/lib/types"

const STATIC_COLUMNS: Array<{ key: string; label: string }> = [
  { key: "name", label: "Name" },
  { key: "lead_score", label: "Score" },
  { key: "rating", label: "Rating" },
  { key: "review_count", label: "Reviews" },
  { key: "website", label: "Site" },
  { key: "contacts", label: "Contacts" },
]

function dynamicColumnId(fieldKey: string): string {
  return `dynamic.${fieldKey}`
}

const SCREENSHOT_COL_ID = "screenshot"

function displayLabel(f: FieldDescriptor): string {
  return f.display && f.display.trim() !== "" ? f.display : f.key
}

export function LeadTableColumnsMenu() {
  const columnHidden = useUiStore((s) => s.leadTableColumnHidden)
  const setColumnHidden = useUiStore((s) => s.setLeadTableColumnHidden)
  const dataColumnShown = useUiStore((s) => s.leadTableDataColumnShown)
  const setDataColumnShown = useUiStore((s) => s.setLeadTableDataColumnShown)
  const resetColumns = useUiStore((s) => s.resetLeadTableColumns)
  const { fields } = useFields()

  const dynamicCols = useMemo(() => {
    const banned = new Set([
      "design_prompt",
      "summary",
      "ai_summary",
      "description",
      "screenshot_path",
      "website_contacts",
    ])
    const candidates = fields
      .filter((f) => f.source === "dynamic")
      .filter((f) => !banned.has(f.key))
      .filter((f) => f.type !== "object")
      .filter((f) => !f.type.startsWith("array"))
      .sort((a, b) => b.coverage - a.coverage)
    return candidates.slice(0, 2)
  }, [fields])

  const dataColCandidates = useMemo(() => {
    const banned = new Set(["reviews", "photos", "addressComponents"])
    return fields
      .filter((f) => f.source === "data")
      .filter((f) => !banned.has(f.key))
      .filter((f) => f.type !== "object")
      .filter((f) => !f.type.startsWith("array"))
      .sort((a, b) => b.coverage - a.coverage)
  }, [fields])

  const showScreenshot = !columnHidden[SCREENSHOT_COL_ID]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-md px-2.5 text-[12px] font-medium"
        >
          <HugeiconsIcon icon={Menu01Icon} size={12} strokeWidth={2} />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="text-[11px]">
          Visible columns
        </DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          className="text-[13px]"
          checked={showScreenshot}
          onCheckedChange={(v) =>
            setColumnHidden(SCREENSHOT_COL_ID, v !== true)
          }
        >
          Preview
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {STATIC_COLUMNS.map((c) => (
          <DropdownMenuCheckboxItem
            key={c.key}
            className="text-[13px]"
            checked={!columnHidden[c.key]}
            onCheckedChange={(v) => setColumnHidden(c.key, v !== true)}
          >
            {c.label}
          </DropdownMenuCheckboxItem>
        ))}
        {dynamicCols.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px]">
              Dynamic fields
            </DropdownMenuLabel>
            {dynamicCols.map((c) => {
              const id = dynamicColumnId(c.key)
              return (
                <DropdownMenuCheckboxItem
                  key={id}
                  className="text-[13px]"
                  checked={!columnHidden[id]}
                  onCheckedChange={(v) => setColumnHidden(id, v !== true)}
                >
                  {displayLabel(c)}
                </DropdownMenuCheckboxItem>
              )
            })}
          </>
        )}
        {dataColCandidates.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px]">
              Imported JSON (Google)
            </DropdownMenuLabel>
            {dataColCandidates.map((c) => {
              const id = fieldClauseKey(c)
              return (
                <DropdownMenuCheckboxItem
                  key={id}
                  className="text-[13px]"
                  checked={dataColumnShown[id] === true}
                  onCheckedChange={(v) => setDataColumnShown(id, v === true)}
                >
                  {displayLabel(c)}
                </DropdownMenuCheckboxItem>
              )
            })}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-[13px]"
          onSelect={() => resetColumns()}
        >
          Show all columns
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
