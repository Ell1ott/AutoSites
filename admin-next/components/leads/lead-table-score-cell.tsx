"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import { leadScoreHeatStyle } from "@/lib/lead-score-heat"
import { cn } from "@/lib/utils"
import type { Lead, SlimLead } from "@/lib/types"

type Props = {
  placeId: string
  value: number | null
}

function clampScore(n: number): number {
  return Math.min(10, Math.max(1, Math.round(n)))
}

function previewHeatScore(draft: string, saved: number | null): number | null {
  const raw = draft.trim()
  if (raw === "") return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return saved
  return clampScore(n)
}

export function LeadTableScoreCell({ placeId, value }: Props): React.JSX.Element {
  const qc = useQueryClient()
  const [draft, setDraft] = useState(() =>
    value != null ? String(value) : "",
  )

  useEffect(() => {
    setDraft(value != null ? String(value) : "")
  }, [placeId, value])

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
      qc.invalidateQueries({ queryKey: ["leads"] })
    },
  })

  function commitFromDraft() {
    const raw = draft.trim()
    if (raw === "") {
      if (value !== null) mut.mutate(null)
      return
    }
    const n = Number(raw)
    if (!Number.isFinite(n)) {
      setDraft(value != null ? String(value) : "")
      return
    }
    const clamped = clampScore(n)
    setDraft(String(clamped))
    if (clamped !== value) mut.mutate(clamped)
  }

  const heatTarget = previewHeatScore(draft, value)
  const heat = leadScoreHeatStyle(heatTarget)

  return (
    <div
      className="flex justify-end"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="number"
        min={1}
        max={10}
        step={1}
        inputMode="numeric"
        disabled={mut.isPending}
        aria-label="Lead score from 1 to 10"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitFromDraft}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === "Enter") {
            e.currentTarget.blur()
          }
        }}
        className={cn(
          "h-7 min-w-7 shrink-0 rounded-full border-0 bg-transparent px-1.5 text-center text-[13px] font-medium tabular-nums shadow-none ring-0 outline-none transition-[background-color,color,filter] duration-150",
          "[-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          heatTarget == null
            ? "bg-muted/50 text-muted-foreground focus-visible:bg-muted/65"
            : "focus-visible:brightness-105",
        )}
        style={heat}
      />
    </div>
  )
}
