"use client"

import { useState } from "react"
import Link from "next/link"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Call02Icon,
  Link04Icon,
  Loading03Icon,
  Mail01Icon,
  PlayIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/ai/copy-button"
import { api } from "@/lib/api"
import { useTrackJob } from "@/lib/store/job-toaster"
import {
  contactCounts,
  hasAnyContactHit,
  hasContacts,
  isLeadCrawled,
  parseWebsiteContacts,
  socialHandle,
  socialLabel,
  type WebsiteContacts,
} from "@/lib/website-contacts"
import type { Lead } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  lead: Lead
  /** When omitted, uses `lead.has_screenshot`. */
  hasScreenshot?: boolean
  compact?: boolean
}

function ContactRow({
  icon,
  label,
  href,
  value,
}: {
  icon: typeof Mail01Icon
  label: string
  href?: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2 text-[12px]">
      <HugeiconsIcon
        icon={icon}
        size={14}
        strokeWidth={1.5}
        className="mt-0.5 shrink-0 text-muted-foreground"
      />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate font-medium text-foreground hover:text-primary"
          >
            {value}
          </a>
        ) : (
          <span className="block truncate font-medium text-foreground">{value}</span>
        )}
      </div>
      <CopyButton text={value} className="shrink-0" />
    </div>
  )
}

function SocialChips({ wc }: { wc: WebsiteContacts }) {
  const entries = Object.entries(wc.socials).flatMap(([platform, urls]) =>
    urls.map((url) => ({ platform, url })),
  )
  if (entries.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(({ platform, url }) => {
        const handle = socialHandle(platform, url)
        return (
          <a
            key={`${platform}:${url}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={handle ? `${socialLabel(platform)} · ${handle}` : url}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-foreground hover:bg-accent/50"
          >
            <HugeiconsIcon
              icon={Link04Icon}
              size={11}
              strokeWidth={1.5}
              className="shrink-0"
            />
            <span className="shrink-0 text-muted-foreground">
              {socialLabel(platform)}
            </span>
            {handle ? (
              <span className="truncate font-medium">{handle}</span>
            ) : null}
          </a>
        )
      })}
    </div>
  )
}

export function WebsiteContactsCard({
  lead,
  hasScreenshot,
  compact,
}: Props) {
  const crawled = hasScreenshot ?? isLeadCrawled(lead)
  const qc = useQueryClient()
  const trackJob = useTrackJob()
  const [runError, setRunError] = useState<string | null>(null)
  const wc = parseWebsiteContacts(lead.dynamic)
  const extracted = hasContacts(lead)
  const counts = contactCounts(wc)

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.startJob("extract_contacts", {
        place_ids: [lead.place_id],
        force: extracted,
      })
      return res
    },
    onSuccess: (res) => {
      trackJob(res.id, {
        title: `Website contacts · ${lead.name}`,
        kind: "extract_contacts",
      })
      qc.invalidateQueries({ queryKey: ["lead", lead.place_id] })
      qc.invalidateQueries({ queryKey: ["leads"] })
      qc.invalidateQueries({ queryKey: ["flow-2", "leads"] })
      setRunError(null)
    },
    onError: (e) => setRunError(e instanceof Error ? e.message : String(e)),
  })

  if (!crawled) return null

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card",
        compact ? "p-3" : "p-4",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-semibold text-foreground">
            Website contacts
          </h3>
          {extracted && wc ? (
            <p className="text-[11px] text-muted-foreground">
              {counts.total} hit{counts.total === 1 ? "" : "s"}
              {wc.pages_scanned != null ? ` · ${wc.pages_scanned} pages` : ""}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Not extracted yet
            </p>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          className="h-7 gap-1 text-[11px]"
        >
          <HugeiconsIcon
            icon={mutation.isPending ? Loading03Icon : PlayIcon}
            size={12}
            className={mutation.isPending ? "animate-spin" : undefined}
          />
          {extracted ? "Re-scan" : "Extract"}
        </Button>
      </div>

      {runError ? (
        <p className="mb-2 text-[11px] text-red-500">{runError}</p>
      ) : null}

      {!extracted ? (
        <p className="text-[12px] text-muted-foreground">
          Run contact extraction from{" "}
          <Link href="/flow-2" className="text-foreground underline">
            Flow 2
          </Link>{" "}
          or use Extract above.
        </p>
      ) : wc && hasAnyContactHit(wc) ? (
        <div className="space-y-3">
          {wc.emails.map((email) => (
            <ContactRow
              key={email}
              icon={Mail01Icon}
              label="Email"
              href={`mailto:${email}`}
              value={email}
            />
          ))}
          <SocialChips wc={wc} />
          {wc.phones.map((phone) => (
            <ContactRow
              key={phone}
              icon={Call02Icon}
              label="Phone"
              href={`tel:${phone.replace(/\s/g, "")}`}
              value={phone}
            />
          ))}
        </div>
      ) : (
        <p className="text-[12px] text-muted-foreground">
          Extraction ran but found no emails, phones, or social links in the
          crawled HTML.
        </p>
      )}

      {extracted && wc?.extracted_at ? (
        <p className="mt-3 text-[10px] text-muted-foreground">
          Extracted {new Date(wc.extracted_at).toLocaleString()}
        </p>
      ) : null}
    </div>
  )
}
