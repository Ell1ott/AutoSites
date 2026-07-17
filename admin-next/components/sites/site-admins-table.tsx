"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { SiteAdminRow } from "@/lib/sites-types"

import { SiteAdminRowActions } from "./site-admin-row-actions"

function formatCreated(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function SiteAdminsTable({
  siteId,
  admins,
}: {
  siteId: string
  admins: SiteAdminRow[]
}) {
  if (admins.length === 0) {
    return (
      <p className="text-muted-foreground text-center text-[13px] py-6">
        No admins for this site.
      </p>
    )
  }

  return (
    <div className="border-border overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="bg-card sticky top-0 z-[1] font-semibold">
              Email
            </TableHead>
            <TableHead className="bg-card sticky top-0 z-[1] font-semibold">
              User ID
            </TableHead>
            <TableHead className="bg-card sticky top-0 z-[1] font-semibold">
              Added
            </TableHead>
            <TableHead className="bg-card sticky top-0 z-[1] w-12 pe-2 font-semibold" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {admins.map((admin) => (
            <TableRow key={admin.user_id}>
              <TableCell className="max-w-72 min-w-0 truncate align-middle">
                {admin.email ?? "Unknown user"}
              </TableCell>
              <TableCell className="max-w-md min-w-0 align-middle font-mono text-xs">
                <span
                  className="text-muted-foreground block truncate"
                  title={admin.user_id}
                >
                  {admin.user_id}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground align-middle text-xs whitespace-nowrap">
                {formatCreated(admin.created_at)}
              </TableCell>
              <TableCell className="w-12 p-0 pe-2 align-middle">
                <SiteAdminRowActions siteId={siteId} admin={admin} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
