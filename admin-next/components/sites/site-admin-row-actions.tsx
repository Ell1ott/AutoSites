"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { MoreHorizontalIcon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createAdminLoginLink } from "@/lib/sites-actions"
import type { SiteAdminRow } from "@/lib/sites-types"

export function SiteAdminRowActions({
  siteId,
  admin,
}: {
  siteId: string
  admin: SiteAdminRow
}) {
  const [pending, setPending] = useState(false)
  const [open, setOpen] = useState(false)

  async function onCreateLoginLink() {
    if (pending || !admin.email) return

    setPending(true)
    try {
      const result = await createAdminLoginLink(siteId, admin.user_id)
      if (result.ok && result.loginLink) {
        await navigator.clipboard.writeText(result.loginLink)
        setOpen(false)
        return
      }
      alert(!result.ok ? result.message : "Could not create login link")
    } catch (e) {
      alert(e instanceof Error ? e.message : "Request failed")
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      className="flex justify-end"
      role="group"
      aria-label="Row actions"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground size-8"
            aria-label={`Admin actions for ${admin.email ?? admin.user_id}`}
            disabled={pending}
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem
            disabled={!admin.email || pending}
            onClick={() => void onCreateLoginLink()}
          >
            Create login link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
