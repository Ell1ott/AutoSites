"use client"

import {
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers"
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Header,
} from "@tanstack/react-table"
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  CursorMove01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { CSSProperties, ReactNode } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { AlertCircleIcon } from "@hugeicons/core-free-icons"

import { Checkbox } from "@/components/ui/checkbox"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAiTasks } from "@/hooks/use-ai-tasks"
import { useFields } from "@/hooks/use-fields"
import { readField } from "@/lib/filter"
import {
  contactCounts,
  parseWebsiteContacts,
  primaryEmail,
} from "@/lib/website-contacts"
import { missingInputsForLead } from "@/lib/missing-inputs"
import { useSelectionStore } from "@/lib/store/selection"
import { useUiStore } from "@/lib/store/ui"
import {
  fieldClauseKey,
  type FieldDescriptor,
  type SlimLead,
  type SortClause,
} from "@/lib/types"
import { cn } from "@/lib/utils"

import { LeadScreenshot } from "./lead-screenshot"
import { LeadTableScoreCell } from "./lead-table-score-cell"
import { useRowSelection } from "./use-row-selection"

type Props = {
  rows: SlimLead[]
  sort?: SortClause
  onSortChange: (next?: SortClause) => void
  onSelect: (placeId: string) => void
  selectedId: string | null
}

const leadTableCollision: CollisionDetection = (args) => {
  const fromPointer = pointerWithin(args)
  if (fromPointer.length > 0) return fromPointer
  return closestCorners(args)
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
  { key: "contacts", label: "Contacts" },
]

/** Stable id for a dynamic field column in the table and in persisted prefs. */
function dynamicColumnId(fieldKey: string): string {
  return `dynamic.${fieldKey}`
}

function isSortKeyHidden(
  sortKey: string | undefined,
  hidden: Record<string, boolean>,
): boolean {
  if (!sortKey) return false
  if (hidden[sortKey]) return true
  if (
    !sortKey.startsWith("dynamic.") &&
    hidden[dynamicColumnId(sortKey)]
  ) {
    return true
  }
  return false
}

const SCREENSHOT_COL_ID = "screenshot"

const SELECT_COL_ID = "select"

const MISSING_COL_ID = "missing-inputs"

/** Merge persisted order with the current catalog (new columns append). */
function mergeColumnOrder(saved: string[], catalogIds: string[]): string[] {
  const catalog = new Set(catalogIds)
  const merged = saved.filter((id) => catalog.has(id))
  for (const id of catalogIds) {
    if (!merged.includes(id)) merged.push(id)
  }
  return merged
}

function applyVisibleReorder(
  fullOrder: string[],
  newVisibleSequence: string[],
  isVisible: (id: string) => boolean,
): string[] {
  let vi = 0
  return fullOrder.map((id) => {
    if (!isVisible(id)) return id
    const next = newVisibleSequence[vi]
    vi += 1
    return next ?? id
  })
}

function displayLabel(f: FieldDescriptor): string {
  return f.display && f.display.trim() !== "" ? f.display : f.key
}

function renderCell(lead: SlimLead, key: string): ReactNode {
  if (key === "website") {
    return lead.website ? (
      <span className="text-[11px] text-muted-foreground">yes</span>
    ) : (
      <span className="text-[11px] text-destructive">no</span>
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
  if (key === "contacts") {
    const wc = parseWebsiteContacts(lead.dynamic)
    const email = primaryEmail(wc)
    const counts = contactCounts(wc)
    if (!lead.has_contacts && !wc?.extracted_at) {
      return <span className="text-[11px] text-muted-foreground">—</span>
    }
    if (email) {
      return (
        <span className="line-clamp-1 font-mono text-[11px] text-foreground">
          {email}
        </span>
      )
    }
    if (counts.total > 0) {
      return (
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {counts.total} hit{counts.total === 1 ? "" : "s"}
        </span>
      )
    }
    return <span className="text-[11px] text-muted-foreground">empty</span>
  }
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

type OrderedCol =
  | { kind: "static"; id: string; column: (typeof STATIC_COLUMNS)[number] }
  | { kind: "dynamic"; id: string; field: FieldDescriptor }
  | { kind: "data"; id: string; field: FieldDescriptor }

function widthForOrderedCol(oc: OrderedCol): number {
  if (oc.kind === "dynamic") return 140
  if (oc.kind === "data") return 160
  const k = oc.column.key
  if (k === "name") return 200
  if (k === "lead_score") return 64
  if (k === "rating") return 64
  if (k === "review_count") return 72
  if (k === "website") return 56
  return 120
}

function sortKeyForOrderedCol(oc: OrderedCol): string {
  if (oc.kind === "static") return oc.column.key
  return fieldClauseKey(oc.field)
}

const columnHelper = createColumnHelper<SlimLead>()

type LeadTableSelectCellProps = {
  placeId: string
  name: string
  onCheckboxClick: (
    placeId: string,
    e: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean },
  ) => void
}

function LeadTableSelectCell({
  placeId,
  name,
  onCheckboxClick,
}: LeadTableSelectCellProps) {
  const checked = useSelectionStore((s) => s.selected.has(placeId))
  return (
    <Checkbox
      checked={checked}
      aria-label={`Select ${name}`}
      onClick={(e) => {
        e.stopPropagation()
        onCheckboxClick(placeId, e)
      }}
    />
  )
}

function MissingInputsCell({
  lead,
  task,
}: {
  lead: SlimLead
  task: { config: import("@/lib/types").AiTaskConfig }
}) {
  const missing = missingInputsForLead(lead, task.config)
  if (missing.length === 0) return null
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
        <TooltipContent side="right">
          <div className="flex flex-col gap-0.5 text-left">
            <span className="font-medium">Missing inputs</span>
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

type SortableLeadColumnHeaderProps = {
  columnId: string
  sortKey: string
  label: string
  align?: "left" | "right"
  sort?: SortClause
  onSortKey: (key: string) => void
  header: Header<SlimLead, unknown>
}

function SortableLeadColumnHeader({
  columnId,
  sortKey,
  label,
  align = "left",
  sort,
  onSortKey,
  header,
}: SortableLeadColumnHeaderProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: columnId,
  })

  const style: CSSProperties = {
    opacity: isDragging ? 0 : 1,
    position: "relative",
    width: header.getSize(),
    maxWidth: header.getSize(),
  }

  const active = sort?.key === sortKey

  return (
    <th
      ref={setNodeRef}
      style={style}
      scope="col"
      className="group/header relative border-b border-border"
    >
      <div className="flex min-w-0 items-center gap-0.5 py-1.5 pl-2 pr-1">
        <span
          className="-ml-0.5 shrink-0 cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:bg-muted/80 hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label={`Reorder column: ${label}`}
          role="presentation"
          tabIndex={-1}
        >
          <HugeiconsIcon icon={CursorMove01Icon} size={12} strokeWidth={2} />
        </span>
        <button
          type="button"
          title="Sort column"
          onClick={() => onSortKey(sortKey)}
          className={cn(
            "min-h-8 min-w-0 flex-1 select-none truncate px-0.5 text-left align-middle text-[11px] font-medium",
            align === "right" ? "text-right" : "",
            active
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span
            className={cn(
              "inline-flex max-w-full items-center gap-1",
              align === "right" && "flex-row-reverse",
            )}
          >
            <span className="truncate">{label}</span>
            {active && (
              <HugeiconsIcon
                icon={sort?.dir === "desc" ? ArrowDown01Icon : ArrowUp01Icon}
                size={10}
                strokeWidth={2}
                className="shrink-0"
              />
            )}
          </span>
        </button>
      </div>
      {header.column.getCanResize() ? (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize column: ${label}`}
          className={cn(
            "absolute right-0 top-0 z-20 h-full w-1 cursor-col-resize touch-none select-none",
            "opacity-0 group-hover/header:opacity-100",
            header.column.getIsResizing() && "bg-primary opacity-100",
          )}
          onMouseDown={(e) => {
            e.stopPropagation()
            header.getResizeHandler()(e)
          }}
          onTouchStart={(e) => {
            e.stopPropagation()
            header.getResizeHandler()(e)
          }}
        />
      ) : null}
    </th>
  )
}

export function LeadTable({
  rows,
  sort,
  onSortChange,
  onSelect,
  selectedId,
}: Props) {
  const selected = useSelectionStore((s) => s.selected)
  const columnHidden = useUiStore((s) => s.leadTableColumnHidden)
  const columnOrderStored = useUiStore((s) => s.leadTableColumnOrder)
  const setColumnOrder = useUiStore((s) => s.setLeadTableColumnOrder)
  const columnSizingStored = useUiStore((s) => s.leadTableColumnSizing)
  const setLeadTableColumnSizing = useUiStore((s) => s.setLeadTableColumnSizing)
  const dataColumnShown = useUiStore((s) => s.leadTableDataColumnShown)
  const { onCheckboxClick } = useRowSelection(rows)
  const { fields } = useFields()

  // Chosen AI task (from SelectionPill). When set, we surface a ⚠ on rows
  // whose required inputs are missing.
  const taskName = useSelectionStore((s) => s.taskName)
  const { tasks } = useAiTasks()
  const currentTask = useMemo(
    () => tasks.find((t) => t.name === taskName) ?? null,
    [tasks, taskName],
  )
  const showMissingCol =
    !!currentTask &&
    currentTask.task_type !== "browser_agent" &&
    currentTask.task_type !== "variant"

  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

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

  const defaultColumnIds = useMemo(
    () => [
      ...STATIC_COLUMNS.map((c) => c.key),
      ...dynamicCols.map((c) => dynamicColumnId(c.key)),
      ...dataColCandidates.map((f) => fieldClauseKey(f)),
    ],
    [dynamicCols, dataColCandidates],
  )

  const mergedColumnOrder = useMemo(
    () => mergeColumnOrder(columnOrderStored, defaultColumnIds),
    [columnOrderStored, defaultColumnIds],
  )

  const isColumnCatalogVisible = useCallback(
    (id: string): boolean => {
      if (STATIC_COLUMNS.some((x) => x.key === id)) {
        return columnHidden[id] !== true
      }
      if (dynamicCols.some((f) => dynamicColumnId(f.key) === id)) {
        return columnHidden[id] !== true
      }
      if (dataColCandidates.some((f) => fieldClauseKey(f) === id)) {
        return dataColumnShown[id] === true
      }
      return false
    },
    [columnHidden, dataColumnShown, dynamicCols, dataColCandidates],
  )

  const orderedDataColumns = useMemo((): OrderedCol[] => {
    const cols: OrderedCol[] = []
    for (const id of mergedColumnOrder) {
      if (!isColumnCatalogVisible(id)) continue
      const st = STATIC_COLUMNS.find((x) => x.key === id)
      if (st) {
        cols.push({ kind: "static", id, column: st })
        continue
      }
      const dyn = dynamicCols.find((f) => dynamicColumnId(f.key) === id)
      if (dyn) {
        cols.push({ kind: "dynamic", id, field: dyn })
        continue
      }
      const dataF = dataColCandidates.find((f) => fieldClauseKey(f) === id)
      if (dataF) {
        cols.push({ kind: "data", id, field: dataF })
      }
    }
    return cols
  }, [
    mergedColumnOrder,
    isColumnCatalogVisible,
    dynamicCols,
    dataColCandidates,
  ])

  const sortableIds = useMemo(
    () => orderedDataColumns.map((c) => c.id),
    [orderedDataColumns],
  )

  const showScreenshot = !columnHidden[SCREENSHOT_COL_ID]

  const sanitizedSizingStored = useMemo(() => {
    const catalog = new Set(defaultColumnIds)
    const o: Record<string, number> = {}
    for (const [k, v] of Object.entries(columnSizingStored)) {
      if (catalog.has(k) && typeof v === "number" && Number.isFinite(v)) {
        o[k] = v
      }
    }
    return o
  }, [columnSizingStored, defaultColumnIds])

  const mergedSizing = useMemo(() => {
    const out: Record<string, number> = {}
    out[SELECT_COL_ID] = 32
    if (showMissingCol) out[MISSING_COL_ID] = 22
    if (showScreenshot) out[SCREENSHOT_COL_ID] = 56
    for (const oc of orderedDataColumns) {
      const id = oc.id
      const def = widthForOrderedCol(oc)
      out[id] = sanitizedSizingStored[id] ?? def
    }
    return out
  }, [orderedDataColumns, showScreenshot, showMissingCol, sanitizedSizingStored])

  const fullColumnOrder = useMemo(
    () => [
      SELECT_COL_ID,
      ...(showMissingCol ? [MISSING_COL_ID] : []),
      ...(showScreenshot ? [SCREENSHOT_COL_ID] : []),
      ...orderedDataColumns.map((c) => c.id),
    ],
    [showScreenshot, showMissingCol, orderedDataColumns],
  )

  const columns = useMemo((): ColumnDef<SlimLead>[] => {
    const defs: ColumnDef<SlimLead>[] = [
      columnHelper.display({
        id: SELECT_COL_ID,
        size: 32,
        minSize: 32,
        maxSize: 32,
        enableResizing: false,
        header: () => null,
        cell: ({ row }) => (
          <LeadTableSelectCell
            placeId={row.original.place_id}
            name={row.original.name}
            onCheckboxClick={onCheckboxClick}
          />
        ),
      }),
    ]

    if (showMissingCol && currentTask) {
      defs.push(
        columnHelper.display({
          id: MISSING_COL_ID,
          size: 22,
          minSize: 22,
          maxSize: 22,
          enableResizing: false,
          header: () => null,
          cell: ({ row }) => (
            <MissingInputsCell lead={row.original} task={currentTask} />
          ),
        }),
      )
    }

    if (showScreenshot) {
      defs.push(
        columnHelper.display({
          id: SCREENSHOT_COL_ID,
          size: 56,
          minSize: 56,
          maxSize: 56,
          enableResizing: false,
          header: () => null,
          cell: ({ row }) => (
            <LeadScreenshot
              lead={row.original}
              className="h-[26px] w-10 rounded-sm border border-border"
            />
          ),
        }),
      )
    }

    for (const oc of orderedDataColumns) {
      const sortKey = sortKeyForOrderedCol(oc)
      const label =
        oc.kind === "static"
          ? oc.column.label
          : displayLabel(oc.field)
      const align =
        oc.kind === "static" ? oc.column.align : ("left" as const)
      const w = widthForOrderedCol(oc)

      defs.push(
        columnHelper.display({
          id: oc.id,
          size: w,
          minSize: 48,
          maxSize: 520,
          meta: { sortKey, label, align },
          header: () => null,
          cell: ({ row }) => {
            if (oc.kind === "static" && oc.column.key === "lead_score") {
              return (
                <LeadTableScoreCell
                  placeId={row.original.place_id}
                  value={row.original.lead_score}
                />
              )
            }
            return renderCell(row.original, sortKey)
          },
        }),
      )
    }

    return defs
  }, [orderedDataColumns, showScreenshot, showMissingCol, currentTask, onCheckboxClick])

  const overlayMeta = useMemo(() => {
    if (!activeDragId) return null
    const oc = orderedDataColumns.find((c) => c.id === activeDragId)
    if (!oc) return null
    const label =
      oc.kind === "static" ? oc.column.label : displayLabel(oc.field)
    return { label, align: oc.kind === "static" ? oc.column.align : "left" }
  }, [activeDragId, orderedDataColumns])

  const table =
    // TanStack Table intentionally returns non-memoizable function refs from this hook.
    // eslint-disable-next-line react-hooks/incompatible-library
    useReactTable({
      data: rows,
      columns,
      getRowId: (row) => row.place_id,
      state: {
        columnOrder: fullColumnOrder,
        columnSizing: mergedSizing,
      },
      onColumnSizingChange: (updater) => {
        const next =
          typeof updater === "function" ? updater(mergedSizing) : updater
        const toStore: Record<string, number> = {}
        for (const id of defaultColumnIds) {
          const v = next[id]
          if (typeof v === "number") toStore[id] = v
        }
        setLeadTableColumnSizing(toStore)
      },
      enableColumnResizing: true,
      columnResizeMode: "onChange",
      getCoreRowModel: getCoreRowModel(),
    })

  useEffect(() => {
    const sk = sort?.key
    if (!sk) return
    if (isSortKeyHidden(sk, columnHidden)) {
      onSortChange(undefined)
      return
    }
    if (sk.startsWith("data.") && dataColumnShown[sk] !== true) {
      onSortChange(undefined)
    }
  }, [sort?.key, columnHidden, dataColumnShown, onSortChange])

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

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sortableIds.indexOf(String(active.id))
    const newIndex = sortableIds.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    const newVisibleSeq = arrayMove(sortableIds, oldIndex, newIndex)
    const nextFull = applyVisibleReorder(
      mergedColumnOrder,
      newVisibleSeq,
      isColumnCatalogVisible,
    )
    setColumnOrder(nextFull)
  }

  const headerGroup = table.getHeaderGroups()[0]
  const headers = headerGroup?.headers ?? []
  const leadingCount =
    1 + (showMissingCol ? 1 : 0) + (showScreenshot ? 1 : 0)
  const leadingHeaders = headers.slice(0, leadingCount)
  const draggableHeaders = headers.slice(leadingCount)

  return (
    <div className="w-full min-w-0">
      <DndContext
        sensors={sensors}
        collisionDetection={leadTableCollision}
        modifiers={[restrictToHorizontalAxis]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="w-full overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-[13px]">
            <colgroup>
              {headers.map((h) => (
                <col key={h.id} style={{ width: h.getSize() }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-10 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/75">
              <tr>
                {leadingHeaders.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    className="border-b border-border px-2 py-1.5"
                    aria-label={
                      header.column.id === SELECT_COL_ID
                        ? "select all"
                        : "screenshot"
                    }
                    style={{
                      width: header.getSize(),
                      maxWidth: header.getSize(),
                    }}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </th>
                ))}
                <SortableContext
                  items={sortableIds}
                  strategy={horizontalListSortingStrategy}
                >
                  {draggableHeaders.map((header) => {
                    const colId = header.column.id
                    const oc = orderedDataColumns.find((c) => c.id === colId)
                    const sortKey = oc ? sortKeyForOrderedCol(oc) : colId
                    const label =
                      oc == null
                        ? colId
                        : oc.kind === "static"
                          ? oc.column.label
                          : displayLabel(oc.field)
                    const align =
                      oc?.kind === "static" ? oc.column.align : "left"
                    return (
                      <SortableLeadColumnHeader
                        key={header.id}
                        columnId={colId}
                        sortKey={sortKey}
                        label={label}
                        align={align}
                        sort={sort}
                        onSortKey={clickHeader}
                        header={header}
                      />
                    )
                  })}
                </SortableContext>
              </tr>
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => {
                const lead = row.original
                const isSelected = selected.has(lead.place_id)
                const isActive = selectedId === lead.place_id
                return (
                  <tr
                    key={row.id}
                    onClick={() => onSelect(lead.place_id)}
                    className={cn(
                      "group/row h-9 cursor-pointer border-b border-border/50 transition-colors",
                      isActive
                        ? "bg-primary/10"
                        : isSelected
                          ? "bg-accent"
                          : "hover:bg-muted/40",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isSelect = cell.column.id === SELECT_COL_ID
                      const meta = cell.column.columnDef.meta as
                        | { align?: "left" | "right" }
                        | undefined
                      const rightAligned =
                        cell.column.id !== SELECT_COL_ID &&
                        cell.column.id !== SCREENSHOT_COL_ID &&
                        meta?.align === "right"
                      return (
                        <td
                          key={cell.id}
                          style={{
                            width: cell.column.getSize(),
                            maxWidth: cell.column.getSize(),
                          }}
                          className={cn(
                            "truncate px-2",
                            rightAligned && "text-right",
                          )}
                          onClick={isSelect ? (e) => e.stopPropagation() : undefined}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <DragOverlay dropAnimation={null}>
          {activeDragId && overlayMeta ? (
            <div
              className={cn(
                "flex min-w-[120px] items-center gap-0.5 rounded-md border border-border bg-background py-1.5 pl-2 pr-3 text-[11px] font-medium text-foreground shadow-md",
                overlayMeta.align === "right" && "justify-end text-right",
              )}
            >
              <HugeiconsIcon
                icon={CursorMove01Icon}
                size={12}
                strokeWidth={2}
                className="shrink-0 text-muted-foreground"
              />
              <span className="truncate">{overlayMeta.label}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
