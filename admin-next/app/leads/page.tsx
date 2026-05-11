"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { LeadGridBig } from "@/components/leads/lead-grid-big"
import { LeadGridSmall } from "@/components/leads/lead-grid-small"
import { LeadTable } from "@/components/leads/lead-table"
import { LeadsHeader } from "@/components/leads/leads-header"
import { Button } from "@/components/ui/button"
import { useFields } from "@/hooks/use-fields"
import { useLeads } from "@/hooks/use-leads"
import { applyFiltersAndSort } from "@/lib/filter"
import { MOCK_LEADS } from "@/lib/mock-leads"
import { useUiStore, type LeadsViewMode } from "@/lib/store/ui"
import type { FilterClause, SlimLead, SortClause } from "@/lib/types"
import { clausesToParams, paramsToClauses } from "@/lib/url"

const USING_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1"

function parseViewMode(s: string | null | undefined): LeadsViewMode | null {
  if (s === "smallGrid" || s === "bigGrid" || s === "table") return s
  return null
}

export default function LeadsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Persisted view mode (from localStorage) is the default; URL ?view= wins
  // when present.
  const storedView = useUiStore((s) => s.viewMode)
  const setStoredView = useUiStore((s) => s.setViewMode)

  // Derive initial state from the URL once on mount.
  const initial = useMemo(() => {
    const sp = new URLSearchParams(searchParams?.toString() ?? "")
    const decoded = paramsToClauses(sp)
    const view = parseViewMode(sp.get("view")) ?? storedView
    const q = sp.get("q") ?? ""
    return {
      filters: decoded.filters,
      sort: decoded.sort,
      view,
      q,
    }
    // We intentionally do NOT depend on storedView so we don't reset state on
    // every store-update tick after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [clauses, setClauses] = useState<FilterClause[]>(initial.filters)
  const [sort, setSort] = useState<SortClause | undefined>(initial.sort)
  const [view, setView] = useState<LeadsViewMode>(initial.view)
  const [searchQuery, setSearchQuery] = useState<string>(initial.q)

  const onViewChange = useCallback(
    (v: LeadsViewMode) => {
      setView(v)
      setStoredView(v)
    },
    [setStoredView],
  )

  // Reflect state back into the URL whenever anything changes.
  useEffect(() => {
    if (typeof window === "undefined") return
    const next = clausesToParams(clauses, sort)
    next.set("view", view)
    if (searchQuery) next.set("q", searchQuery)
    const url = new URL(window.location.href)
    url.search = next.toString()
    router.replace(url.pathname + url.search, { scroll: false })
  }, [clauses, sort, view, searchQuery, router])

  // ----- data -----
  const leadsQuery = useLeads()
  const { fields } = useFields()

  const usingMockFallback = USING_MOCKS && leadsQuery.isError
  const rows: SlimLead[] = useMemo(() => {
    if (leadsQuery.data) return leadsQuery.data
    if (usingMockFallback) return MOCK_LEADS
    return []
  }, [leadsQuery.data, usingMockFallback])

  const combinedClauses: FilterClause[] = useMemo(() => {
    const q = searchQuery.trim()
    if (!q) return clauses
    return [...clauses, { key: "name", op: "like", value: q }]
  }, [clauses, searchQuery])

  const filtered = useMemo(
    () =>
      applyFiltersAndSort(
        rows as unknown as Array<Record<string, unknown>>,
        combinedClauses,
        sort,
        fields.length > 0 ? fields : undefined,
      ) as unknown as SlimLead[],
    [rows, combinedClauses, sort, fields],
  )

  // ----- render -----
  const isLoading = leadsQuery.isPending && !usingMockFallback
  const hardError = leadsQuery.isError && !usingMockFallback

  return (
    <div className="flex flex-col">
      {usingMockFallback && (
        <div className="border-b border-yellow-500/20 bg-yellow-500/10 px-4 py-1.5 text-[12px] text-yellow-500">
          Showing mock data — backend unreachable (NEXT_PUBLIC_USE_MOCKS=1).
        </div>
      )}

      <LeadsHeader
        filteredCount={filtered.length}
        totalCount={rows.length}
        clauses={clauses}
        onClausesChange={setClauses}
        sort={sort}
        onSortChange={setSort}
        view={view}
        onViewChange={onViewChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {isLoading && <LoadingState view={view} />}

      {hardError && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-12 text-center">
          <p className="text-[13px] text-foreground">
            Couldn&apos;t load leads. {leadsQuery.error.message}
          </p>
          <p className="text-[12px] text-muted-foreground">
            Backend at NEXT_PUBLIC_PI_URL reachable?
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => leadsQuery.refetch()}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !hardError && filtered.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-12 text-center">
          <p className="text-[13px] text-foreground">
            {rows.length === 0
              ? "No leads yet."
              : "No leads match these filters."}
          </p>
          {(clauses.length > 0 || searchQuery !== "") && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setClauses([])
                setSearchQuery("")
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}

      {!isLoading && !hardError && filtered.length > 0 && (
        <>
          {view === "smallGrid" && <LeadGridSmall rows={filtered} />}
          {view === "bigGrid" && <LeadGridBig rows={filtered} />}
          {view === "table" && (
            <LeadTable rows={filtered} sort={sort} onSortChange={setSort} />
          )}
        </>
      )}
    </div>
  )
}

function LoadingState({ view }: { view: LeadsViewMode }) {
  if (view === "table") {
    return (
      <div className="p-4">
        <div className="flex flex-col gap-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-full animate-pulse rounded-sm bg-muted/40"
            />
          ))}
        </div>
      </div>
    )
  }
  const cols = view === "bigGrid" ? "minmax(400px,1fr)" : "minmax(240px,1fr)"
  return (
    <div
      className="grid gap-4 p-4"
      style={{ gridTemplateColumns: `repeat(auto-fill, ${cols})` }}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card"
        >
          <div className="aspect-[16/10] w-full animate-pulse bg-muted/40" />
          <div className="flex flex-col gap-1.5 p-3">
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted/50" />
            <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted/40" />
          </div>
        </div>
      ))}
    </div>
  )
}
