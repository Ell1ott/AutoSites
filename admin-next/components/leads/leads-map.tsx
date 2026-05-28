"use client"

import { useEffect, useMemo, useRef } from "react"
import { useTheme } from "next-themes"
import type { LayerGroup, Map as LeafletMap, TileLayer } from "leaflet"

import {
  buildColorLegend,
  formatColorValue,
  numericContextForField,
  resolveLeadPinColor,
  type ColorLegend,
} from "@/lib/lead-map-color"
import type { LeadsMapPoint } from "@/lib/lead-map-leads"
import { cn } from "@/lib/utils"

import "leaflet/dist/leaflet.css"

export type LeadsMapProps = {
  points: LeadsMapPoint[]
  colorField: string
  selectedLeadId?: string | null
  onLeadSelect?: (placeId: string) => void
  className?: string
}

const DEFAULT_CENTER = { lat: 55.6761, lng: 12.5683 }
const DEFAULT_ZOOM = 11

const TILES = {
  light: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
} as const

const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

type MapLayer = {
  map: LeafletMap
  tileLayer: TileLayer
  leadLayer: LayerGroup
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function pointsSignature(points: LeadsMapPoint[]): string {
  return points.map((p) => p.placeId).join("|")
}

function ColorLegendOverlay({ legend }: { legend: ColorLegend | null }) {
  if (!legend) return null

  if (legend.kind === "gradient") {
    const gradient = legend.stops
      .map((s) => s.color)
      .join(", ")
    return (
      <div className="pointer-events-none absolute bottom-3 left-3 z-[1] max-w-[220px] rounded-lg border border-border bg-popover/95 px-3 py-2 shadow-md backdrop-blur-sm">
        <div className="mb-1.5 text-[11px] font-medium text-foreground">
          {legend.label}
        </div>
        <div
          className="mb-1 h-2 w-full rounded-full"
          style={{
            background: `linear-gradient(to right, ${gradient})`,
          }}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          {legend.stops.map((s) => (
            <span key={s.label}>{s.label}</span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[1] max-w-[220px] rounded-lg border border-border bg-popover/95 px-3 py-2 shadow-md backdrop-blur-sm">
      <div className="mb-1.5 text-[11px] font-medium text-foreground">
        {legend.label}
      </div>
      <div className="flex flex-col gap-1">
        {legend.items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 text-[10px] text-muted-foreground"
          >
            <span
              className="size-2.5 shrink-0 rounded-full border border-background"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function LeadsMap({
  points,
  colorField,
  selectedLeadId,
  onLeadSelect,
  className,
}: LeadsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<MapLayer | null>(null)
  const onLeadSelectRef = useRef(onLeadSelect)
  const prevPointsSigRef = useRef("")
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  onLeadSelectRef.current = onLeadSelect

  const legend = useMemo(
    () => buildColorLegend(colorField, points),
    [colorField, points],
  )

  const colorContext = useMemo(
    () => numericContextForField(points, colorField),
    [points, colorField],
  )

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const L = await import("leaflet")
      if (cancelled || !containerRef.current) return

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], DEFAULT_ZOOM)

      const tileLayer = L.tileLayer(isDark ? TILES.dark : TILES.light, {
        maxZoom: 19,
        attribution: ATTRIBUTION,
      }).addTo(map)

      const leadLayer = L.layerGroup().addTo(map)
      layerRef.current = { map, tileLayer, leadLayer }

      requestAnimationFrame(() => {
        map.invalidateSize()
      })
    })()

    return () => {
      cancelled = true
      layerRef.current?.map.remove()
      layerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    layer.tileLayer.setUrl(isDark ? TILES.dark : TILES.light)
  }, [isDark])

  useEffect(() => {
    const el = containerRef.current
    const map = layerRef.current?.map
    if (!el || !map) return

    const ro = new ResizeObserver(() => {
      map.invalidateSize()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer || !selectedLeadId) return
    const point = points.find((p) => p.placeId === selectedLeadId)
    if (!point) return
    layer.map.panTo([point.lat, point.lng], { animate: true })
  }, [selectedLeadId, points])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return

    let cancelled = false

    void (async () => {
      const L = await import("leaflet")
      if (cancelled) return

      layer.leadLayer.clearLayers()

      if (points.length === 0) {
        layer.map.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], DEFAULT_ZOOM)
        prevPointsSigRef.current = ""
        return
      }

      const bounds = L.latLngBounds([
        [points[0].lat, points[0].lng],
        [points[0].lat, points[0].lng],
      ])

      for (const point of points) {
        const isSelected = selectedLeadId === point.placeId
        const pinColor = resolveLeadPinColor(point.lead, colorField, colorContext)
        const icon = L.divIcon({
          className: cn(
            "leads-map-pin",
            isSelected && "leads-map-pin-selected",
          ),
          html: `<span style="background-color:${pinColor.backgroundColor}"></span>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        })

        const marker = L.marker([point.lat, point.lng], { icon })
        const name = escapeHtml(point.name)
        const statLabel = escapeHtml(formatColorValue(point.lead, colorField))
        marker.bindPopup(
          `<div class="discover-map-popup">
            <div class="discover-map-popup-title">${name}</div>
            <div class="text-muted-foreground mb-1 text-[11px]">${escapeHtml(legend?.label ?? colorField)}: ${statLabel}</div>
            <button type="button" class="discover-map-popup-link leads-map-popup-btn">View details</button>
          </div>`,
        )
        marker.on("popupopen", () => {
          const popupEl = marker.getPopup()?.getElement()
          const btn = popupEl?.querySelector(".leads-map-popup-btn")
          btn?.addEventListener("click", () => {
            onLeadSelectRef.current?.(point.placeId)
          })
        })
        marker.on("click", () => onLeadSelectRef.current?.(point.placeId))
        layer.leadLayer.addLayer(marker)
        bounds.extend([point.lat, point.lng])
      }

      const sig = pointsSignature(points)
      if (sig !== prevPointsSigRef.current) {
        layer.map.fitBounds(bounds.pad(0.12), { maxZoom: 14 })
        prevPointsSigRef.current = sig
      }
    })()

    return () => {
      cancelled = true
    }
  }, [points, colorField, selectedLeadId, colorContext, legend?.label])

  return (
    <div className={cn("relative min-h-0 flex-1", className)}>
      <div
        ref={containerRef}
        className="leaflet-map bg-muted/30 size-full min-h-0"
        role="application"
        aria-label="Map of leads"
      />
      <ColorLegendOverlay legend={legend} />
    </div>
  )
}
