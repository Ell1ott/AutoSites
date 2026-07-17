"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { addSiteAdmin } from "@/lib/sites-actions"

export function AddSiteAdminDialog({
  siteId,
  open,
  onOpenChange,
}: {
  siteId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [pending, setPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setEmail("")
      setErrorMessage(null)
      setPending(false)
    }
  }, [open])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pending) return

    const trimmed = email.trim()
    if (!trimmed) {
      setErrorMessage("Email is required")
      return
    }

    setPending(true)
    setErrorMessage(null)
    try {
      const result = await addSiteAdmin(siteId, trimmed)
      if (result.ok) {
        onOpenChange(false)
        router.refresh()
        return
      }
      setErrorMessage(result.message)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Request failed")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add admin</DialogTitle>
          <DialogDescription>
            Grant a user access to manage this site. If no account exists for the
            email, one will be created.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label
              htmlFor="add-admin-email"
              className="text-sm font-medium leading-none"
            >
              Email
            </label>
            <Input
              id="add-admin-email"
              type="email"
              autoComplete="email"
              placeholder="user@example.com"
              required
              disabled={pending}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {errorMessage ? (
            <p className="text-destructive text-sm">{errorMessage}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add admin"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
