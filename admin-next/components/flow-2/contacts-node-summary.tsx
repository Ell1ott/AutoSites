"use client"

import Link from "next/link"

import type { Flow2Node } from "@/lib/lead-flow-2"
import {
  contactCounts,
  hasAnyContactHit,
  hasContacts,
  parseWebsiteContacts,
  primaryEmail,
  socialLabel,
} from "@/lib/website-contacts"
import type { SlimLead } from "@/lib/types"

type Props = {
  leads: SlimLead[]
  node: Flow2Node
}

export function ContactsNodeSummary({ leads, node }: Props) {
  const completeIds = new Set(node.leadIdsByState.complete)
  const completed = leads.filter((l) => completeIds.has(l.place_id))

  let withEmail = 0
  let withSocial = 0
  let emptyExtracted = 0
  for (const lead of completed) {
    const wc = parseWebsiteContacts(lead.dynamic)
    if (!wc) continue
    if (wc.emails.length > 0) withEmail += 1
    if (Object.keys(wc.socials).length > 0) withSocial += 1
    if (!hasAnyContactHit(wc)) emptyExtracted += 1
  }

  const samples = completed
    .map((lead) => {
      const wc = parseWebsiteContacts(lead.dynamic)
      if (!wc || !hasAnyContactHit(wc)) return null
      const socialPlatforms = Object.keys(wc.socials)
      return {
        placeId: lead.place_id,
        name: lead.name,
        email: primaryEmail(wc),
        socials: socialPlatforms.slice(0, 3),
        counts: contactCounts(wc),
      }
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .slice(0, 5)

  return (
    <section className="mt-5 space-y-4">
      <div>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Pipeline stats
        </h3>
        <ul className="space-y-1 text-[12px] text-foreground">
          <li className="flex justify-between gap-2">
            <span>Extracted</span>
            <span className="tabular-nums font-medium">{node.counts.complete}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Ready to run</span>
            <span className="tabular-nums font-medium">{node.counts.ready}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span>With email</span>
            <span className="tabular-nums font-medium">{withEmail}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span>With social</span>
            <span className="tabular-nums font-medium">{withSocial}</span>
          </li>
        </ul>
      </div>

      {emptyExtracted > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          {emptyExtracted} extracted lead{emptyExtracted === 1 ? "" : "s"} had no
          contact hits — some sites hide details behind JavaScript.
        </p>
      ) : null}

      {samples.length > 0 ? (
        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Sample contacts
          </h3>
          <ul className="space-y-2">
            {samples.map((s) => (
              <li key={s.placeId} className="rounded-md border border-border bg-background px-2.5 py-2">
                <Link
                  href={`/leads/${s.placeId}`}
                  className="block truncate text-[12px] font-medium text-foreground hover:text-primary"
                >
                  {s.name}
                </Link>
                {s.email ? (
                  <p className="truncate font-mono text-[10px] text-muted-foreground">
                    {s.email}
                  </p>
                ) : null}
                {s.socials.length > 0 ? (
                  <p className="truncate text-[10px] text-muted-foreground">
                    {s.socials.map((p) => socialLabel(p)).join(" · ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Open in leads
        </h3>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href="/leads?where%5Bdynamic.website_contacts%5D%5Bexists%5D=1"
            className="rounded-md border border-border px-2 py-1 text-[11px] text-foreground hover:bg-accent/50"
          >
            Extracted ({completed.filter((l) => hasContacts(l)).length})
          </Link>
          <Link
            href="/leads?where%5Bdynamic.website_contacts%5D%5Bnotexists%5D=1"
            className="rounded-md border border-border px-2 py-1 text-[11px] text-foreground hover:bg-accent/50"
          >
            Missing ({node.counts.ready})
          </Link>
        </div>
      </div>
    </section>
  )
}
