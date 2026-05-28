"use client"

import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Cancel01Icon,
  Search01Icon,
  StarIcon,
} from "@hugeicons/core-free-icons"

import { useFieldsQuery } from "@/hooks/use-fields"
import {
  operatorsForField,
  valueWidgetForField,
} from "@/lib/filter"
import {
  fieldClauseKey,
  type FieldDescriptor,
  type FilterClause,
  type FilterOp,
} from "@/lib/types"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

// -----------------------------------------------------------------------------
// Op labels — short, used in the chips.
// -----------------------------------------------------------------------------

const OP_LABEL: Record<FilterOp, string> = {
  eq: "is",
  ne: "is not",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  like: "contains",
  in: "in",
  exists: "exists",
  notexists: "missing",
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function displayLabel(f: FieldDescriptor): string {
  return f.display && f.display.trim() !== "" ? f.display : f.key
}

function formatChipValue(clause: FilterClause): string {
  if (clause.op === "exists" || clause.op === "notexists") return ""
  const v = clause.value
  if (v === undefined || v === null) return ""
  if (Array.isArray(v)) return v.join(", ")
  if (typeof v === "boolean") return v ? "true" : "false"
  return String(v)
}

// -----------------------------------------------------------------------------
// Inline value widget shared by add + edit popovers.
// -----------------------------------------------------------------------------

function ValueWidget({
  field,
  op,
  value,
  onChange,
}: {
  field: FieldDescriptor
  op: FilterOp
  value: unknown
  onChange: (v: unknown) => void
}) {
  if (op === "exists" || op === "notexists") return null

  const widget = valueWidgetForField(field)

  if (field.enum_values && field.enum_values.length > 0 && (op === "eq" || op === "ne")) {
    return (
      <Select
        value={value === undefined || value === null ? undefined : String(value)}
        onValueChange={(v) => onChange(v)}
      >
        <SelectTrigger size="sm" className="w-full">
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {field.enum_values.map((ev) => (
            <SelectItem key={String(ev)} value={String(ev)}>
              {String(ev)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (op === "in") {
    // Comma-separated values.
    const text = Array.isArray(value)
      ? value.join(", ")
      : value !== undefined && value !== null
        ? String(value)
        : ""
    return (
      <Input
        className="h-8 text-[12px]"
        placeholder="value1, value2"
        value={text}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0),
          )
        }
      />
    )
  }

  if (widget === "boolean") {
    return (
      <Select
        value={value === undefined ? undefined : String(value)}
        onValueChange={(v) => onChange(v === "true")}
      >
        <SelectTrigger size="sm" className="w-full">
          <SelectValue placeholder="true/false" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">true</SelectItem>
          <SelectItem value="false">false</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  if (widget === "number" || widget === "stars-1-10") {
    const min = widget === "stars-1-10" ? 1 : undefined
    const max = widget === "stars-1-10" ? 10 : undefined
    return (
      <div className="flex items-center gap-1.5">
        {widget === "stars-1-10" && (
          <HugeiconsIcon
            icon={StarIcon}
            size={14}
            strokeWidth={1.5}
            className="text-muted-foreground"
          />
        )}
        <Input
          type="number"
          min={min}
          max={max}
          className="h-8 text-[12px]"
          value={
            value === undefined || value === null ? "" : String(value)
          }
          onChange={(e) => onChange(e.target.value)}
          placeholder={widget === "stars-1-10" ? "1–10" : "value"}
        />
      </div>
    )
  }

  // Default: text.
  return (
    <Input
      className="h-8 text-[12px]"
      placeholder="value"
      value={
        value === undefined || value === null ? "" : String(value)
      }
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

// -----------------------------------------------------------------------------
// Field picker — searchable list inside the popover.
// -----------------------------------------------------------------------------

function FieldPicker({
  fields,
  onPick,
}: {
  fields: FieldDescriptor[]
  onPick: (f: FieldDescriptor) => void
}) {
  const [q, setQ] = useState("")
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return fields
    return fields.filter((f) => {
      const label = displayLabel(f).toLowerCase()
      return label.includes(needle) || f.key.toLowerCase().includes(needle)
    })
  }, [q, fields])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 rounded-md border bg-input/30 px-2">
        <HugeiconsIcon
          icon={Search01Icon}
          size={14}
          strokeWidth={1.5}
          className="text-muted-foreground"
        />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search fields…"
          className="h-8 flex-1 bg-transparent text-[12px] outline-none placeholder:text-muted-foreground"
        />
      </div>
      <ul className="max-h-60 overflow-y-auto">
        {filtered.length === 0 && (
          <li className="px-2 py-1.5 text-[12px] text-muted-foreground">
            No fields match.
          </li>
        )}
        {filtered.map((f) => (
          <li key={`${f.source}:${f.key}`}>
            <button
              type="button"
              onClick={() => onPick(f)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-accent hover:text-foreground"
            >
              <span className="truncate">{displayLabel(f)}</span>
              <span className="ml-2 shrink-0 font-mono text-[10px] text-muted-foreground">
                {f.type}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Clause editor (operator + value) — used after the field is picked, plus
// when editing an existing chip.
// -----------------------------------------------------------------------------

function ClauseEditor({
  field,
  draft,
  setDraft,
  onSubmit,
  onCancel,
  onBack,
}: {
  field: FieldDescriptor
  draft: FilterClause
  setDraft: (next: FilterClause) => void
  onSubmit: () => void
  onCancel: () => void
  onBack?: () => void
}) {
  const ops = useMemo(() => operatorsForField(field), [field])

  function onOpChange(opValue: string) {
    const op = opValue as FilterOp
    // When switching to/from value-less ops, scrub the value.
    if (op === "exists" || op === "notexists") {
      setDraft({ ...draft, op, value: undefined })
    } else {
      setDraft({ ...draft, op })
    }
  }

  const valueRequired = draft.op !== "exists" && draft.op !== "notexists"

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-medium">{displayLabel(field)}</div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            Change field
          </button>
        )}
      </div>

      <div className="grid grid-cols-[auto_1fr] items-center gap-2">
        <label className="text-[11px] text-muted-foreground">Op</label>
        <Select value={draft.op} onValueChange={onOpChange}>
          <SelectTrigger size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ops.map((op) => (
              <SelectItem key={op} value={op}>
                {OP_LABEL[op]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {valueRequired && (
          <>
            <label className="text-[11px] text-muted-foreground">Value</label>
            <ValueWidget
              field={field}
              op={draft.op}
              value={draft.value}
              onChange={(v) => setDraft({ ...draft, value: v })}
            />
          </>
        )}
      </div>

      <div className="flex justify-end gap-1.5 pt-1">
        <Button variant="ghost" size="xs" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button size="xs" onClick={onSubmit} type="button">
          Apply
        </Button>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Chip — one rendered FilterClause + edit popover.
// -----------------------------------------------------------------------------

function FilterChip({
  clause,
  index,
  fields,
  onChange,
  onRemove,
}: {
  clause: FilterClause
  index: number
  fields: FieldDescriptor[]
  onChange: (i: number, next: FilterClause) => void
  onRemove: (i: number) => void
}) {
  const [open, setOpen] = useState(false)
  const field = useMemo(
    () =>
      fields.find((f) => f.key === clause.key) ??
      fields.find(
        (f) =>
          (clause.key.startsWith("dynamic.") &&
            f.key === clause.key.slice("dynamic.".length)) ||
          "dynamic." + f.key === clause.key,
      ),
    [fields, clause.key],
  )

  // Internal draft used while editing.
  const [draft, setDraft] = useState<FilterClause>(clause)

  function openEdit(o: boolean) {
    if (o) setDraft(clause)
    setOpen(o)
  }

  function commit() {
    onChange(index, draft)
    setOpen(false)
  }

  // Fallback descriptor if we don't have a backing field — keeps chip editable.
  const editorField: FieldDescriptor = field ?? {
    key: clause.key,
    type: "string",
    source: clause.key.startsWith("dynamic.") ? "dynamic" : "column",
    coverage: 0,
  }

  const label = displayLabel(editorField)
  const valueText = formatChipValue(clause)

  return (
    <div className="inline-flex items-center">
      <Popover open={open} onOpenChange={openEdit}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-l-md border bg-background px-2 text-[12px] text-foreground transition-colors hover:bg-muted",
              open && "border-primary",
            )}
          >
            <span className="font-medium">{label}</span>
            <span className="text-muted-foreground">{OP_LABEL[clause.op]}</span>
            {valueText && (
              <span className="inline-flex items-center gap-1 text-foreground">
                {editorField.format === "stars-1-10" && (
                  <HugeiconsIcon
                    icon={StarIcon}
                    size={12}
                    strokeWidth={1.5}
                    className="text-muted-foreground"
                  />
                )}
                {valueText}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-72 rounded-md p-2"
          sideOffset={4}
        >
          <ClauseEditor
            field={editorField}
            draft={draft}
            setDraft={setDraft}
            onSubmit={commit}
            onCancel={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
      <button
        type="button"
        onClick={() => onRemove(index)}
        aria-label="Remove filter"
        className={cn(
          "inline-flex h-7 w-6 items-center justify-center rounded-r-md border border-l-0 bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
          open && "border-primary",
        )}
      >
        <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={1.75} />
      </button>
    </div>
  )
}

// -----------------------------------------------------------------------------
// AddChip — the trailing "+" with two-step popover (pick field → edit clause).
// -----------------------------------------------------------------------------

function AddChip({
  fields,
  disabled,
  onAdd,
  hint,
}: {
  fields: FieldDescriptor[]
  disabled?: boolean
  onAdd: (clause: FilterClause) => void
  hint?: string
}) {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<FieldDescriptor | null>(null)
  const [draft, setDraft] = useState<FilterClause | null>(null)

  function reset() {
    setPicked(null)
    setDraft(null)
  }

  function handleOpen(o: boolean) {
    if (!o) reset()
    setOpen(o)
  }

  function onPick(f: FieldDescriptor) {
    setPicked(f)
    const initialOps = operatorsForField(f)
    const op = initialOps[0] ?? "eq"
    const key = fieldClauseKey(f)
    setDraft({ key, op, value: undefined })
  }

  function commit() {
    if (draft) {
      onAdd(draft)
    }
    setOpen(false)
    reset()
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="xs"
          disabled={disabled}
          className="h-7 gap-1 rounded-md text-[12px]"
        >
          <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={1.75} />
          {hint ?? "Add filter"}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 rounded-md p-2"
        sideOffset={4}
      >
        {picked && draft ? (
          <ClauseEditor
            field={picked}
            draft={draft}
            setDraft={setDraft}
            onSubmit={commit}
            onCancel={() => setOpen(false)}
            onBack={reset}
          />
        ) : (
          <FieldPicker fields={fields} onPick={onPick} />
        )}
      </PopoverContent>
    </Popover>
  )
}

// -----------------------------------------------------------------------------
// FilterBuilder — controlled top-level component.
// -----------------------------------------------------------------------------

type Props = {
  clauses: FilterClause[]
  onChange: (next: FilterClause[]) => void
  fields?: FieldDescriptor[]
  compact?: boolean
  fieldFilter?: (f: FieldDescriptor) => boolean
}

export function FilterBuilder({
  clauses,
  onChange,
  fields,
  fieldFilter,
}: Props) {
  // Shared `/fields` cache — `hooks/use-fields.ts` exposes the same query key
  // used by the leads page so we only fetch the schema once per session.
  const fetched = useFieldsQuery()

  const allFields = useMemo(() => {
    if (fields) return fields
    const data = fetched.data
    if (!data) return []
    return [...(data.columns ?? []), ...(data.dynamic ?? [])]
  }, [fields, fetched.data])

  const filterableFields = useMemo(() => {
    const baseFilter =
      fieldFilter ?? ((f: FieldDescriptor) => f.filterable !== false)
    return allFields.filter(baseFilter)
  }, [allFields, fieldFilter])

  function replaceAt(i: number, next: FilterClause) {
    const out = clauses.slice()
    out[i] = next
    onChange(out)
  }
  function removeAt(i: number) {
    onChange(clauses.filter((_, idx) => idx !== i))
  }
  function add(c: FilterClause) {
    onChange([...clauses, c])
  }

  // Loading state — no parent-provided fields, query still pending.
  const isLoading = !fields && fetched.isPending
  const isOffline = !fields && fetched.isError

  if (isLoading) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="inline-flex h-7 items-center rounded-md border bg-muted/50 px-2 text-[12px] text-muted-foreground">
          Loading filters…
        </div>
        <Button
          variant="outline"
          size="xs"
          disabled
          className="h-7 gap-1 rounded-md text-[12px]"
        >
          <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={1.75} />
          Add filter
        </Button>
      </div>
    )
  }

  if (isOffline) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant="outline"
          size="xs"
          disabled
          className="h-7 gap-1 rounded-md text-[12px]"
        >
          <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={1.75} />
          Add filter
        </Button>
        <span className="text-[11px] text-muted-foreground">
          Backend offline — filters unavailable
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {clauses.map((c, i) => (
        <FilterChip
          key={`${c.key}-${c.op}-${i}`}
          clause={c}
          index={i}
          fields={allFields}
          onChange={replaceAt}
          onRemove={removeAt}
        />
      ))}
      <AddChip fields={filterableFields} onAdd={add} />
    </div>
  )
}
