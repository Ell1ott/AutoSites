"use client"

import dynamic from "next/dynamic"
import { useCallback, useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  MapsLocation01Icon,
} from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { formatRadiusMeters } from "@/lib/discover-map-leads"
import {
  DEFAULT_LOCATION_FILTER,
  extractLocationFilter,
  isLocationFilterClause,
  setLocationFilter,
  type LocationWithinValue,
} from "@/lib/location-filter"
import type { FilterClause } from "@/lib/types"
import { cn } from "@/lib/utils"

import type { DiscoverMapHandle } from "@/components/discover/discover-map"

const DiscoverMap = dynamic(
  () =>
    import("@/components/discover/discover-map").then((m) => ({
      default: m.DiscoverMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/30 flex h-[220px] w-full items-center justify-center rounded-md">
        <span className="text-muted-foreground text-[12px]">Loading map…</span>
      </div>
    ),
  },
)

type Props = {
  clauses: FilterClause[]
  onClausesChange: (next: FilterClause[]) => void
}

function formatCenter(v: LocationWithinValue): string {
  return `${v.lat.toFixed(4)}, ${v.lng.toFixed(4)}`
}

export function LocationFilterChip({ clauses, onClausesChange }: Props) {
  const active = useMemo(() => extractLocationFilter(clauses), [clauses])
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<LocationWithinValue>(
    active ?? DEFAULT_LOCATION_FILTER,
  )
  const mapRef = useRef<DiscoverMapHandle>(null)

  function handleOpen(next: boolean) {
    if (next) {
      setDraft(active ?? DEFAULT_LOCATION_FILTER)
    }
    setOpen(next)
  }

  const handleCenterChange = useCallback((lat: number, lng: number) => {
    setDraft((prev) => ({ ...prev, lat, lng }))
  }, [])

  function apply() {
    const fromMap = mapRef.current?.getSearchCenter()
    const next: LocationWithinValue = {
      ...draft,
      lat: fromMap?.lat ?? draft.lat,
      lng: fromMap?.lng ?? draft.lng,
    }
    onClausesChange(setLocationFilter(clauses, next))
    setOpen(false)
  }

  function remove() {
    onClausesChange(setLocationFilter(clauses, null))
    setOpen(false)
  }

  if (!active) {
    return (
      <Popover open={open} onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="xs"
            className="h-7 gap-1 rounded-md text-[12px]"
          >
            <HugeiconsIcon icon={MapsLocation01Icon} size={12} strokeWidth={1.75} />
            Near place
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(100vw-2rem,22rem)] rounded-md p-3"
          sideOffset={4}
        >
          <LocationFilterEditor
            draft={draft}
            setDraft={setDraft}
            mapRef={mapRef}
            onCenterChange={handleCenterChange}
            onApply={apply}
            onCancel={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <div className="inline-flex items-center">
      <Popover open={open} onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-l-md border bg-background px-2 text-[12px] text-foreground transition-colors hover:bg-muted",
              open && "border-primary",
            )}
          >
            <HugeiconsIcon
              icon={MapsLocation01Icon}
              size={12}
              strokeWidth={1.75}
              className="text-muted-foreground"
            />
            <span className="font-medium">Within</span>
            <span>{formatRadiusMeters(active.radius_m)}</span>
            <span className="text-muted-foreground font-mono tabular-nums">
              {formatCenter(active)}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(100vw-2rem,22rem)] rounded-md p-3"
          sideOffset={4}
        >
          <LocationFilterEditor
            draft={draft}
            setDraft={setDraft}
            mapRef={mapRef}
            onCenterChange={handleCenterChange}
            onApply={apply}
            onCancel={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
      <button
        type="button"
        onClick={remove}
        aria-label="Remove location filter"
        className={cn(
          "inline-flex h-7 w-6 items-center justify-center rounded-r-md border border-l-0 bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
          open && "border-primary",
        )}
      >
        <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={1.75} />
      </button>
    </div>
  )
}

function LocationFilterEditor({
  draft,
  setDraft,
  mapRef,
  onCenterChange,
  onApply,
  onCancel,
}: {
  draft: LocationWithinValue
  setDraft: (next: LocationWithinValue) => void
  mapRef: React.RefObject<DiscoverMapHandle | null>
  onCenterChange: (lat: number, lng: number) => void
  onApply: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-[12px] font-medium">Location filter</div>
        <p className="text-muted-foreground mt-0.5 text-[11px]">
          Click the map or drag the pin to set the center. Leads without
          coordinates are excluded.
        </p>
      </div>

      <div className="overflow-hidden rounded-md border">
        <DiscoverMap
          ref={mapRef}
          center={{ lat: draft.lat, lng: draft.lng }}
          radiusM={draft.radius_m}
          onCenterChange={onCenterChange}
          className="h-[220px]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
            Radius
          </span>
          <Badge
            variant="secondary"
            className="font-mono text-[11px] font-normal tabular-nums"
          >
            {formatRadiusMeters(draft.radius_m)} · {Math.round(draft.radius_m)} m
          </Badge>
        </div>
        <Slider
          value={[draft.radius_m]}
          min={50}
          max={100_000}
          step={500}
          onValueChange={(v) =>
            setDraft({ ...draft, radius_m: v[0] ?? draft.radius_m })
          }
          aria-label="Location filter radius"
        />
      </div>

      <div className="text-muted-foreground text-[11px]">
        Center:{" "}
        <span className="text-foreground font-mono tabular-nums">
          {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
        </span>
      </div>

      <div className="flex justify-end gap-1.5">
        <Button variant="ghost" size="xs" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button size="xs" onClick={onApply} type="button">
          Apply
        </Button>
      </div>
    </div>
  )
}

/** Strip location clauses before passing to FilterBuilder. */
export function fieldFilterClauses(clauses: FilterClause[]): FilterClause[] {
  return clauses.filter((c) => !isLocationFilterClause(c))
}
