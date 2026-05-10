"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
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
import { useUiStore } from "@/lib/store/ui"

const NAV_ITEMS = [
  { href: "/leads", label: "Leads", icon: UserGroupIcon },
  { href: "/queue", label: "Queue", icon: Queue01Icon },
  { href: "/tasks", label: "Tasks", icon: Task01Icon },
  { href: "/discover", label: "Discover", icon: Compass01Icon },
  { href: "/sites", label: "Sites", icon: Globe02Icon },
] as const

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/")
}

export function SideNav() {
  const pathname = usePathname()
  const expanded = useUiStore((s) => s.sideNavPinned)
  const setExpanded = useUiStore((s) => s.setSideNavPinned)
  const railRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!expanded) return
    function handleClick(e: MouseEvent) {
      if (railRef.current && !railRef.current.contains(e.target as Node)) {
        setExpanded(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [expanded, setExpanded])

  function toggleExpanded() {
    setExpanded(!expanded)
  }

  return (
    <div
      ref={railRef}
      style={{
        width: expanded ? 200 : 48,
        transition: "width 150ms ease-out",
        position: expanded ? "fixed" : "relative",
        zIndex: expanded ? 50 : undefined,
        top: 0,
        left: 0,
        height: "100%",
      }}
      className="flex flex-col bg-background border-r shrink-0"
    >
      <nav className="flex flex-1 flex-col gap-0.5 py-1">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = isActive(pathname, href)
          return (
            <Tooltip key={href}>
              <TooltipTrigger asChild>
                <Link
                  href={href}
                  className={[
                    "flex h-9 items-center gap-2.5 rounded-md mx-1 px-2.5 text-[13px] transition-colors",
                    active
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  ].join(" ")}
                >
                  <HugeiconsIcon icon={icon} size={16} strokeWidth={1.5} />
                  {expanded && (
                    <span className="whitespace-nowrap overflow-hidden">{label}</span>
                  )}
                </Link>
              </TooltipTrigger>
              {!expanded && (
                <TooltipContent side="right" sideOffset={8}>
                  {label}
                </TooltipContent>
              )}
            </Tooltip>
          )
        })}
      </nav>

      <div className="py-1">
        <button
          onClick={toggleExpanded}
          className="flex h-9 w-full items-center gap-2.5 rounded-md mx-1 px-2.5 text-[13px] text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
          style={{ width: "calc(100% - 8px)" }}
          aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
        >
          <HugeiconsIcon icon={Menu01Icon} size={16} strokeWidth={1.5} />
          {expanded && <span className="whitespace-nowrap">Collapse</span>}
        </button>
      </div>
    </div>
  )
}
