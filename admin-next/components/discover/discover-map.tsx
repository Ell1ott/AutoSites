"use client"

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react"
import { useTheme } from "next-themes"
import type { Circle, LayerGroup, Map as LeafletMap, Marker, TileLayer } from "leaflet"

import type { DiscoverMapLead } from "@/lib/discover-map-leads"
import { cn } from "@/lib/utils"

import "leaflet/dist/leaflet.css"

export type { DiscoverMapLead }

export type DiscoverMapHandle = {
  /** Read the pin position directly from Leaflet (source of truth for search). */
  getSearchCenter: () => { lat: number; lng: number } | null
}

export type DiscoverMapProps = {
  center: { lat: number; lng: number }
  radiusM: number
  onCenterChange: (lat: number, lng: number) => void
  leads?: DiscoverMapLead[]
  selectedLeadId?: string | null
  onLeadSelect?: (placeId: string) => void
  className?: string
}

const TILES = {
  light: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
} as const

const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

type MapLayer = {
  map: LeafletMap
  marker: Marker
  circle: Circle
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

export const DiscoverMap = forwardRef<DiscoverMapHandle, DiscoverMapProps>(
  function DiscoverMap(
    {
      center,
      radiusM,
      onCenterChange,
      leads = [],
      selectedLeadId,
      onLeadSelect,
      className,
    },
    ref,
  ) {
  const containerRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<MapLayer | null>(null)
  const onCenterChangeRef = useRef(onCenterChange)
  const onLeadSelectRef = useRef(onLeadSelect)
  const skipCenterSyncRef = useRef(false)
  const prevLeadCountRef = useRef(0)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  onCenterChangeRef.current = onCenterChange
  onLeadSelectRef.current = onLeadSelect

  useImperativeHandle(ref, () => ({
    getSearchCenter() {
      const layer = layerRef.current
      if (!layer) return null
      const ll = layer.marker.getLatLng()
      return { lat: ll.lat, lng: ll.lng }
    },
  }))

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const L = await import("leaflet")
      if (cancelled || !containerRef.current) return

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([center.lat, center.lng], 11)

      const tileLayer = L.tileLayer(isDark ? TILES.dark : TILES.light, {
        maxZoom: 19,
        attribution: ATTRIBUTION,
      }).addTo(map)

      const pinIcon = L.divIcon({
        className: "discover-map-center-pin",
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      })

      const marker = L.marker([center.lat, center.lng], {
        draggable: true,
        icon: pinIcon,
        zIndexOffset: 1000,
      }).addTo(map)

      const circle = L.circle([center.lat, center.lng], {
        radius: radiusM,
        color: "var(--primary)",
        weight: 2,
        fillOpacity: 0.12,
      }).addTo(map)

      const leadLayer = L.layerGroup().addTo(map)

      marker.on("dragend", () => {
        const ll = marker.getLatLng()
        skipCenterSyncRef.current = true
        onCenterChangeRef.current(ll.lat, ll.lng)
        circle.setLatLng(ll)
      })

      map.on("click", (e) => {
        marker.setLatLng(e.latlng)
        circle.setLatLng(e.latlng)
        skipCenterSyncRef.current = true
        onCenterChangeRef.current(e.latlng.lat, e.latlng.lng)
      })

      layerRef.current = { map, marker, circle, tileLayer, leadLayer }

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
    if (skipCenterSyncRef.current) {
      skipCenterSyncRef.current = false
      return
    }
    layer.marker.setLatLng([center.lat, center.lng])
    layer.circle.setLatLng([center.lat, center.lng])
  }, [center.lat, center.lng])

  useEffect(() => {
    layerRef.current?.circle.setRadius(radiusM)
  }, [radiusM])

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
    const lead = leads.find((l) => l.placeId === selectedLeadId)
    if (!lead) return
    layer.map.panTo([lead.lat, lead.lng], { animate: true })
  }, [selectedLeadId, leads])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return

    let cancelled = false

    void (async () => {
      const L = await import("leaflet")
      if (cancelled) return

      layer.leadLayer.clearLayers()
      if (leads.length === 0) {
        prevLeadCountRef.current = 0
        return
      }

      const bounds = L.latLngBounds([
        [center.lat, center.lng],
        [center.lat, center.lng],
      ])

      for (const lead of leads) {
        const isSelected = selectedLeadId === lead.placeId
        const icon = L.divIcon({
          className: cn(
            "discover-map-lead-pin",
            lead.isNew ? "discover-map-lead-pin-new" : "discover-map-lead-pin-existing",
            isSelected && "discover-map-lead-pin-selected",
          ),
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        })

        const marker = L.marker([lead.lat, lead.lng], { icon })
        const label = lead.name ? escapeHtml(lead.name) : lead.placeId
        const search = lead.name ? encodeURIComponent(lead.name) : ""
        marker.bindPopup(
          `<div class="discover-map-popup">
            <div class="discover-map-popup-title">${label}</div>
            <a class="discover-map-popup-link" href="/leads${search ? `?q=${search}` : ""}">View in leads</a>
          </div>`,
        )
        marker.on("click", () => onLeadSelectRef.current?.(lead.placeId))
        layer.leadLayer.addLayer(marker)
        bounds.extend([lead.lat, lead.lng])
      }

      if (leads.length > 0 && prevLeadCountRef.current === 0) {
        bounds.extend([center.lat, center.lng])
        layer.map.fitBounds(bounds.pad(0.15), { maxZoom: 14 })
      }
      prevLeadCountRef.current = leads.length
    })()

    return () => {
      cancelled = true
    }
  }, [leads, selectedLeadId, center.lat, center.lng])

  return (
    <div
      ref={containerRef}
      className={cn("discover-map bg-muted/30 size-full min-h-0", className)}
      role="application"
      aria-label="Map: click to set search center"
    />
  )
  },
)
