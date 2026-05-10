"use client"

import { usePathname } from "next/navigation"
import { QueueIndicator } from "./queue-indicator"
import { ThemeToggle } from "./theme-toggle"

const SECTION_TITLES: Record<string, string> = {
  leads: "Leads",
  queue: "Queue",
  tasks: "Tasks",
  discover: "Discover",
  sites: "Sites",
}

function useRouteTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length === 0) return ""
  const base = SECTION_TITLES[segments[0]] ?? segments[0]
  return base
}

export function TopBar() {
  const pathname = usePathname()
  const title = useRouteTitle(pathname)

  return (
    <div className="flex h-8 shrink-0 items-center justify-between border-b bg-background px-3">
      <span className="text-[13px] font-medium text-foreground">{title}</span>
      <div className="flex items-center gap-1">
        <QueueIndicator />
        <ThemeToggle />
      </div>
    </div>
  )
}
