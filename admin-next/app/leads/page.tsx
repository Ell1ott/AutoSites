"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { FilterBuilder } from "@/components/filter/filter-builder"
import { clausesToParams, paramsToClauses } from "@/lib/url"
import type { FilterClause, SortClause } from "@/lib/types"

export default function LeadsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Derive initial state from the URL once on mount.
  const initial = useMemo(() => {
    const sp = new URLSearchParams(searchParams?.toString() ?? "")
    return paramsToClauses(sp)
  }, [searchParams])

  const [clauses, setClauses] = useState<FilterClause[]>(initial.filters)
  const [sort] = useState<SortClause | undefined>(initial.sort)

  // Reflect state back into the URL whenever clauses change. Using
  // router.replace keeps history clean.
  useEffect(() => {
    if (typeof window === "undefined") return
    const next = clausesToParams(clauses, sort)
    const url = new URL(window.location.href)
    url.search = next.toString()
    router.replace(url.pathname + url.search, { scroll: false })
  }, [clauses, sort, router])

  return (
    <div className="flex flex-col gap-3 p-4">
      <FilterBuilder clauses={clauses} onChange={setClauses} />
      <p className="text-[12px] text-muted-foreground">
        Leads list view coming next. Active filters:{" "}
        <code className="font-mono text-[11px]">{JSON.stringify(clauses)}</code>
      </p>
    </div>
  )
}
