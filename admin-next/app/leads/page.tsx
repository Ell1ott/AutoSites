"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { UserGroupIcon } from "@hugeicons/core-free-icons"

import { EmptyState } from "@/components/shell/empty-state"
import { LeadGridBig } from "@/components/leads/lead-grid-big"
import { LeadGridSmall } from "@/components/leads/lead-grid-small"
import { LeadSidePanel } from "@/components/leads/lead-side-panel"
import { LeadTable } from "@/components/leads/lead-table"
import { LeadsHeader } from "@/components/leads/leads-header"
import { Button } from "@/components/ui/button"
import { useFields } from "@/hooks/use-fields"
import { useLeads } from "@/hooks/use-leads"
import { applyFiltersAndSort } from "@/lib/filter"
import { DEFAULT_MAP_COLOR_FIELD } from "@/lib/lead-map-color"
import { buildLeadsMapPoints } from "@/lib/lead-map-leads"
import { MOCK_LEADS } from "@/lib/mock-leads"
import { useUiStore, type LeadsViewMode } from "@/lib/store/ui"
import type { FilterClause, SlimLead, SortClause } from "@/lib/types"
import { clausesToParams, paramsToClauses } from "@/lib/url"
import { cn } from "@/lib/utils"

const LeadsMap = dynamic(
  () =>
    import("@/components/leads/leads-map").then((m) => ({
      default: m.LeadsMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/30 flex min-h-0 flex-1 items-center justify-center">
        <span className="text-muted-foreground text-[12px]">Loading map…</span>
      </div>
    ),
  },
)

const USING_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1"

function parseViewMode(s: string | null | undefined): LeadsViewMode | null {
  if (
    s === "smallGrid" ||
    s === "bigGrid" ||
    s === "table" ||
    s === "map"
  ) {
    return s
  }
  return null
}

export default function LeadsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const storedView = useUiStore((s) => s.viewMode)
  const setStoredView = useUiStore((s) => s.setViewMode)
  const storedMapColorField = useUiStore((s) => s.mapColorField)
  const setStoredMapColorField = useUiStore((s) => s.setMapColorField)

  const initial = useMemo(() => {
    const sp = new URLSearchParams(searchParams?.toString() ?? "")
    const decoded = paramsToClauses(sp)
    const view = parseViewMode(sp.get("view")) ?? storedView
    const q = sp.get("q") ?? ""
    const mapColor = sp.get("mapColor") ?? storedMapColorField
    return {
      filters: decoded.filters,
      sort: decoded.sort,
      view,
      q,
      mapColor,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [clauses, setClauses] = useState<FilterClause[]>(initial.filters)
  const [sort, setSort] = useState<SortClause | undefined>(initial.sort)
  const [view, setView] = useState<LeadsViewMode>(initial.view)
  const [searchQuery, setSearchQuery] = useState<string>(initial.q)
  const [mapColorField, setMapColorField] = useState<string>(
    initial.mapColor || DEFAULT_MAP_COLOR_FIELD,
  )
  const selectedLeadId = useUiStore((s) => s.selectedLeadId)
  const setSelectedLeadId = useUiStore((s) => s.setSelectedLeadId)
  const leadDetailFullScreen = useUiStore((s) => s.leadDetailFullScreen)
  const setLeadDetailFullScreen = useUiStore((s) => s.setLeadDetailFullScreen)

  useEffect(() => {
    if (selectedLeadId && leadDetailFullScreen) {
      router.replace(`/leads/${selectedLeadId}`)
    }
  }, [selectedLeadId, leadDetailFullScreen, router])

  useEffect(() => {
    if (!selectedLeadId || leadDetailFullScreen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedLeadId(null)
        setLeadDetailFullScreen(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [
    selectedLeadId,
    leadDetailFullScreen,
    setSelectedLeadId,
    setLeadDetailFullScreen,
  ])

  const onViewChange = useCallback(
    (v: LeadsViewMode) => {
      setView(v)
      setStoredView(v)
    },
    [setStoredView],
  )

  const onMapColorFieldChange = useCallback(
    (key: string) => {
      setMapColorField(key)
      setStoredMapColorField(key)
    },
    [setStoredMapColorField],
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    const next = clausesToParams(clauses, sort)
    next.set("view", view)
    if (searchQuery) next.set("q", searchQuery)
    if (view === "map" && mapColorField !== DEFAULT_MAP_COLOR_FIELD) {
      next.set("mapColor", mapColorField)
    }
    const url = new URL(window.location.href)
    url.search = next.toString()
    router.replace(url.pathname + url.search, { scroll: false })
  }, [clauses, sort, view, searchQuery, mapColorField, router])

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

  const { points: mapPoints, missingCount: mapMissingCount } = useMemo(
    () => buildLeadsMapPoints(filtered),
    [filtered],
  )

  const isLoading = leadsQuery.isPending && !usingMockFallback
  const hardError = leadsQuery.isError && !usingMockFallback

  const selectLead = useCallback(
    (placeId: string) => {
      setLeadDetailFullScreen(false)
      setSelectedLeadId(placeId)
    },
    [setSelectedLeadId, setLeadDetailFullScreen],
  )
  const closePanel = useCallback(() => {
    setSelectedLeadId(null)
    setLeadDetailFullScreen(false)
  }, [setSelectedLeadId, setLeadDetailFullScreen])

  const isMapView = view === "map"
  const showSidePanel = selectedLeadId && !leadDetailFullScreen

  return (
    <div
      className={cn(
        "grid h-full min-h-0",
        showSidePanel
          ? "grid-cols-[minmax(0,1fr)_minmax(420px,33vw)]"
          : "grid-cols-1",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col",
          isMapView ? "h-full min-h-0 overflow-hidden" : "overflow-y-auto",
        )}
      >
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
          showTableColumnsMenu={view === "table"}
          mapColorField={mapColorField}
          onMapColorFieldChange={onMapColorFieldChange}
          mapPointsCount={isMapView ? mapPoints.length : undefined}
          mapMissingCount={isMapView ? mapMissingCount : undefined}
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
          <EmptyState
            icon={UserGroupIcon}
            title={rows.length === 0 ? "No leads yet" : "No leads match these filters"}
            description={
              rows.length === 0
                ? "Leads you discover or import will show up here."
                : "Try adjusting your filters or search to see more results."
            }
            action={
              clauses.length > 0 || searchQuery !== "" ? (
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
              ) : undefined
            }
          />
        )}

        {!isLoading &&
          !hardError &&
          filtered.length > 0 &&
          isMapView &&
          mapPoints.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-12 text-center">
              <p className="text-[13px] text-foreground">
                No leads with location data match these filters.
              </p>
              <p className="text-[12px] text-muted-foreground">
                {filtered.length}{" "}
                {filtered.length === 1 ? "lead matches" : "leads match"}, but
                none have map coordinates.
              </p>
            </div>
          )}

        {!isLoading && !hardError && filtered.length > 0 && (
          <>
            {view === "smallGrid" && (
              <LeadGridSmall
                rows={filtered}
                onSelect={selectLead}
                selectedId={selectedLeadId}
              />
            )}
            {view === "bigGrid" && (
              <LeadGridBig
                rows={filtered}
                onSelect={selectLead}
                selectedId={selectedLeadId}
              />
            )}
            {view === "table" && (
              <LeadTable
                rows={filtered}
                sort={sort}
                onSortChange={setSort}
                onSelect={selectLead}
                selectedId={selectedLeadId}
              />
            )}
            {view === "map" && mapPoints.length > 0 && (
              <LeadsMap
                points={mapPoints}
                colorField={mapColorField}
                selectedLeadId={selectedLeadId}
                onLeadSelect={selectLead}
              />
            )}
          </>
        )}
      </div>

      {showSidePanel && (
        <LeadSidePanel placeId={selectedLeadId} onClose={closePanel} />
      )}
    </div>
  )
}

function LoadingState({ view }: { view: LeadsViewMode }) {
  if (view === "map") {
    return (
      <div className="bg-muted/30 flex min-h-0 flex-1 items-center justify-center">
        <span className="text-muted-foreground text-[12px]">Loading map…</span>
      </div>
    )
  }
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
