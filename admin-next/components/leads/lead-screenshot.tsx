"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Image01Icon } from "@hugeicons/core-free-icons"

import { getScreenshotUrl } from "@/lib/leads"
import type { SlimLead } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  lead: SlimLead
  className?: string
  /** Hint passed to the underlying <img> for the browser to lazy-load. */
  loading?: "eager" | "lazy"
}

/**
 * Renders a lead's screenshot, falling back to a muted placeholder block when
 * the screenshot URL is missing OR returns 404. Always renders something —
 * never throws or returns null — so the surrounding card/row layouts stay
 * stable while images load.
 */
export function LeadScreenshot({ lead, className, loading = "lazy" }: Props) {
  const url = getScreenshotUrl(lead)
  const [failed, setFailed] = useState(false)
  const show = url && !failed

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted/30 text-muted-foreground",
        className,
      )}
    >
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url!}
          alt=""
          loading={loading}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <HugeiconsIcon
            icon={Image01Icon}
            size={20}
            strokeWidth={1.25}
            className="opacity-40"
          />
        </div>
      )}
    </div>
  )
}
