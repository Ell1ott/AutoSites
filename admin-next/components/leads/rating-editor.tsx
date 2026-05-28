"use client"

import * as React from "react"
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import { StarIcon, Tick02Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { Lead, SlimLead } from "@/lib/types"

type Props = {
  placeId: string
  value: number | null
  className?: string
}

const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

/**
 * Inline rating chip + popover with 1-10 buttons. Optimistically updates
 * both the lead-detail cache and the leads-list cache so the leads grid
 * reflects the rating immediately. Clears via `api.rateLead(placeId, null)`.
 */
export function RatingEditor({
  placeId,
  value,
  className,
}: Props): React.JSX.Element {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const mut = useMutation({
    mutationFn: async (v: number | null) => api.rateLead(placeId, v),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["lead", placeId] })
      const prevLead = qc.getQueryData<Lead>(["lead", placeId])
      if (prevLead) {
        qc.setQueryData<Lead>(["lead", placeId], {
          ...prevLead,
          lead_score: v,
        })
      }
      const prevList = qc.getQueryData<SlimLead[]>(["leads"])
      qc.setQueryData<SlimLead[] | undefined>(["leads"], (old) =>
        old?.map((l) =>
          l.place_id === placeId ? { ...l, lead_score: v } : l,
        ) ?? old,
      )
      return { prevLead, prevList }
    },
    onError: (_err, _v, ctx) => {
      if (ctx?.prevLead) {
        qc.setQueryData(["lead", placeId], ctx.prevLead)
      }
      if (ctx?.prevList) {
        qc.setQueryData(["leads"], ctx.prevList)
      } else {
        qc.invalidateQueries({ queryKey: ["leads"] })
      }
    },
    onSuccess: () => {
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 1200)
      qc.invalidateQueries({ queryKey: ["leads"] })
    },
  })

  function pick(v: number | null) {
    mut.mutate(v)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="xs"
          variant={value != null ? "secondary" : "ghost"}
          className={cn("gap-1", className)}
        >
          <HugeiconsIcon icon={StarIcon} size={12} strokeWidth={1.75} />
          {savedFlash ? (
            <span className="inline-flex items-center gap-1">
              <HugeiconsIcon
                icon={Tick02Icon}
                size={12}
                strokeWidth={2}
                className="text-emerald-500"
              />
              Saved
            </span>
          ) : value != null ? (
            <span>{value}/10</span>
          ) : (
            <span className="text-muted-foreground">Rate</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto gap-2 p-3">
        <div className="text-muted-foreground text-[11px] uppercase tracking-wide">
          Lead score
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {NUMBERS.map((n) => {
            const active = value === n
            return (
              <Button
                key={n}
                type="button"
                size="icon-sm"
                variant={active ? "default" : "outline"}
                className="h-8 w-8 rounded-md"
                onClick={() => pick(n)}
                disabled={mut.isPending}
              >
                {n}
              </Button>
            )
          })}
        </div>
        <div className="mt-1 flex justify-end">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => pick(null)}
            disabled={mut.isPending || value == null}
          >
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
