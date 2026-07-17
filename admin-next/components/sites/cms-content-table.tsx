"use client"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { CmsContentRow } from "@/lib/sites-types"

function formatUpdated(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function valuePreview(row: CmsContentRow): string {
  try {
    return JSON.stringify(row.value, null, 2)
  } catch {
    return String(row.value)
  }
}

function valueOneLine(row: CmsContentRow): string {
  try {
    return JSON.stringify(row.value)
  } catch {
    return String(row.value)
  }
}

export function CmsContentTable({ rows }: { rows: CmsContentRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-[13px]">No content keys yet.</p>
    )
  }

  return (
    <div className="border-border max-h-[min(70vh,720px)] overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="bg-card sticky top-0 z-[1] w-[22%] font-semibold">
              Key
            </TableHead>
            <TableHead className="bg-card sticky top-0 z-[1] w-[8%] font-semibold">
              Kind
            </TableHead>
            <TableHead className="bg-card sticky top-0 z-[1] font-semibold">
              Value
            </TableHead>
            <TableHead className="bg-card sticky top-0 z-[1] w-[14%] font-semibold">
              Updated
            </TableHead>
            <TableHead className="bg-card sticky top-0 z-[1] w-[18%] font-semibold">
              Updated by
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell className="max-w-0 align-middle font-mono text-xs">
                <span className="block truncate" title={row.key}>
                  {row.key}
                </span>
              </TableCell>
              <TableCell className="align-middle">
                <Badge variant="secondary" className="font-medium">
                  {row.kind}
                </Badge>
              </TableCell>
              <TableCell className="max-w-0 align-middle">
                <span
                  className="text-muted-foreground block truncate font-mono text-xs"
                  title={valuePreview(row)}
                >
                  {valueOneLine(row)}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground align-middle text-xs whitespace-nowrap">
                {formatUpdated(row.updated_at)}
              </TableCell>
              <TableCell className="text-muted-foreground max-w-0 align-middle font-mono text-xs">
                <span className="block truncate" title={row.updated_by ?? ""}>
                  {row.updated_by ?? "—"}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
