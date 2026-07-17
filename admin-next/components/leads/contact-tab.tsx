"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  Call02Icon,
  Link04Icon,
  Mail01Icon,
  MapsLocation01Icon,
} from "@hugeicons/core-free-icons"

import { CopyButton } from "@/components/ai/copy-button"
import {
  getListingAddress,
  getListingPhones,
  getMapsUrl,
} from "@/lib/lead-contacts"
import type { Lead } from "@/lib/types"

import { isLeadCrawled } from "@/lib/website-contacts"

import { CopyMapsDataButton } from "./copy-maps-data-button"
import { WebsiteContactsCard } from "./website-contacts-card"

type Props = {
  lead: Lead
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

export function ContactTab({ lead }: Props): React.JSX.Element {
  const address = getListingAddress(lead)
  const phones = getListingPhones(lead)
  const mapsUrl = getMapsUrl(lead)
  const crawled = isLeadCrawled(lead)
  const hasListingData = Boolean(address || phones.length > 0 || lead.website)

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-[13px] font-semibold text-foreground">
            Listing contacts
          </h2>
          <CopyMapsDataButton lead={lead} />
        </div>
        <div className="space-y-3">
          {address ? (
            <ContactRow
              icon={MapsLocation01Icon}
              label="Address"
              value={address}
            />
          ) : null}
          {phones.map((phone, i) => (
            <ContactRow
              key={`phone-${i}`}
              icon={Call02Icon}
              label={phones.length > 1 ? `Phone ${i + 1}` : "Phone"}
              href={`tel:${phone.replace(/\s/g, "")}`}
              value={phone}
            />
          ))}
          {lead.website ? (
            <ContactRow
              icon={Link04Icon}
              label="Website"
              href={lead.website}
              value={lead.website}
            />
          ) : null}
          <ContactRow
            icon={MapsLocation01Icon}
            label="Google Maps"
            href={mapsUrl}
            value="Open in Maps"
          />
        </div>
        {!hasListingData ? (
          <p className="mt-3 text-[12px] text-muted-foreground">
            No address or phone from the Google listing.
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 text-[13px] font-semibold text-foreground">
          Website contacts
        </h2>
        {!crawled ? (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[12px] text-muted-foreground">
              Crawl the website first (screenshot + HTML) before contact extraction
              can run.
            </p>
          </div>
        ) : (
          <WebsiteContactsCard lead={lead} />
        )}
      </section>
    </div>
  )
}
