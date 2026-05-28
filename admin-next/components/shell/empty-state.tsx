"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"

type Props = {
  icon: IconSvgElement
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: Props) {
  return (
    <div
      className={
        "flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center " +
        (className ?? "")
      }
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <HugeiconsIcon icon={icon} size={26} strokeWidth={1.5} />
      </div>
      <div className="space-y-1">
        <p className="text-[14px] font-medium text-foreground">{title}</p>
        {description ? (
          <p className="text-[12px] text-muted-foreground max-w-sm mx-auto">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
