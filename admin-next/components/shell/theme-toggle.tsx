"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { HugeiconsIcon } from "@hugeicons/react"
import { Sun01Icon, Moon01Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"

type Props = {
  className?: string
}

export function ThemeToggle({ className }: Props) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  function toggle() {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground",
        className,
      )}
      aria-label="Toggle theme"
    >
      {mounted ? (
        <HugeiconsIcon
          icon={theme === "dark" ? Sun01Icon : Moon01Icon}
          size={14}
          strokeWidth={1.5}
        />
      ) : (
        <span className="h-3.5 w-3.5" />
      )}
    </button>
  )
}
