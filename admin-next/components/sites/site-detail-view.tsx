"use client"

import { useState } from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, UserAdd01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import type { CmsContentRow, SiteAdminRow, SiteRow } from "@/lib/sites-types"

import { AddSiteAdminDialog } from "./add-site-admin-dialog"
import { CmsContentTable } from "./cms-content-table"
import { SiteAdminsTable } from "./site-admins-table"

export function SiteDetailView({
  site,
  admins,
  cmsContent,
}: {
  site: SiteRow
  admins: SiteAdminRow[]
  cmsContent: CmsContentRow[]
}) {
  const [addAdminOpen, setAddAdminOpen] = useState(false)

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <header className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Back to sites"
          asChild
        >
          <Link href="/sites">
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl leading-none font-semibold tracking-tight truncate">
            {site.name}
          </h1>
          <p className="text-muted-foreground mt-1 font-mono text-[12px] truncate">
            /{site.slug} · {site.id}
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border-border flex min-h-[280px] flex-col rounded-xl border bg-card shadow-[var(--shadow-card)]">
          <div className="flex flex-row items-center justify-between gap-2 border-b px-5 py-4">
            <h2 className="text-base font-semibold">Admins</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddAdminOpen(true)}
            >
              <HugeiconsIcon icon={UserAdd01Icon} strokeWidth={2} />
              Add admin
            </Button>
          </div>
          <div className="flex-1 p-5 pt-4">
            <SiteAdminsTable siteId={site.id} admins={admins} />
          </div>
        </section>

        <section className="border-border flex min-h-[200px] flex-col rounded-xl border bg-card shadow-[var(--shadow-card)]">
          <div className="border-b px-5 py-4">
            <h2 className="text-base font-semibold">Events</h2>
          </div>
          <div className="flex flex-1 flex-col justify-center p-5 pt-4">
            <p className="text-muted-foreground text-center text-sm">
              No events yet.
            </p>
          </div>
        </section>
      </div>

      <AddSiteAdminDialog
        siteId={site.id}
        open={addAdminOpen}
        onOpenChange={setAddAdminOpen}
      />

      <section className="border-border rounded-xl border bg-card shadow-[var(--shadow-card)]">
        <div className="border-b px-5 py-4">
          <h2 className="text-base font-semibold">Content keys</h2>
        </div>
        <div className="p-5 pt-4">
          <CmsContentTable rows={cmsContent} />
        </div>
      </section>
    </div>
  )
}
