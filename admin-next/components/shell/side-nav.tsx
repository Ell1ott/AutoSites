"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  DashboardSquare01Icon,
  UserGroupIcon,
  Queue01Icon,
  Task01Icon,
  Compass01Icon,
  Globe02Icon,
  Menu01Icon,
} from "@hugeicons/core-free-icons"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { QueueIndicator } from "@/components/shell/queue-indicator"
import { ThemeToggle } from "@/components/shell/theme-toggle"
import { useUiStore } from "@/lib/store/ui"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/overview", label: "Overview", icon: DashboardSquare01Icon },
  { href: "/leads", label: "Leads", icon: UserGroupIcon },
  { href: "/queue", label: "Queue", icon: Queue01Icon },
  { href: "/tasks", label: "Tasks", icon: Task01Icon },
  { href: "/discover", label: "Discover", icon: Compass01Icon },
  { href: "/sites", label: "Sites", icon: Globe02Icon },
] as const

const RAIL_ICON =
  "mx-1 flex h-9 w-[calc(100%-8px)] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/")
}

export function SideNav() {
  const pathname = usePathname()
  const expanded = useUiStore((s) => s.sideNavExpanded)
  const setExpanded = useUiStore((s) => s.setSideNavExpanded)
  const selectedLeadId = useUiStore((s) => s.selectedLeadId)
  const leadDetailFullScreen = useUiStore((s) => s.leadDetailFullScreen)

  return (
    <div
      style={{
        width: expanded ? 200 : 48,
        transition: "width 150ms ease-out",
      }}
      className="flex h-full shrink-0 flex-col border-r bg-background"
    >
      <nav className="flex flex-1 flex-col gap-0.5 py-1">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const itemHref =
            href === "/leads" && selectedLeadId && leadDetailFullScreen
              ? `/leads/${selectedLeadId}`
              : href
          const active = isActive(pathname, href)
          const link = (
            <Link
              href={itemHref}
              className={cn(
                "mx-1 flex h-9 items-center rounded-md text-[13px] transition-colors",
                expanded
                  ? "gap-2.5 px-2.5"
                  : "w-[calc(100%-8px)] justify-center",
                active
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <HugeiconsIcon icon={icon} size={16} strokeWidth={1.5} />
              {expanded ? (
                <span className="overflow-hidden whitespace-nowrap">{label}</span>
              ) : null}
            </Link>
          )

          if (expanded) return <div key={href}>{link}</div>

          return (
            <Tooltip key={href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {label}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </nav>

      <div className="flex flex-col gap-0.5 border-t border-border py-1">
        {expanded ? (
          <div className="mx-1 flex items-center justify-between gap-1 px-1">
            <QueueIndicator />
            <div className="flex items-center gap-0.5">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                aria-label="Collapse navigation"
              >
                <HugeiconsIcon icon={Menu01Icon} size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <QueueIndicator compact />
            <Tooltip>
              <TooltipTrigger asChild>
                <ThemeToggle className={RAIL_ICON} />
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Toggle theme
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className={RAIL_ICON}
                  aria-label="Expand navigation"
                >
                  <HugeiconsIcon icon={Menu01Icon} size={16} strokeWidth={1.5} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Expand
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </div>
  )
}
