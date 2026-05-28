"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowExpand02Icon,
  Bookmark01Icon,
  Bookmark02Icon,
} from "@hugeicons/core-free-icons"

import { getPiBackendBase } from "@/lib/pi-url"
import { api } from "@/lib/api"
import type { Lead, VariantDesignPreview, VariantDesignResult } from "@/lib/types"
import { cn } from "@/lib/utils"

import { VariantDesignViewer } from "./variant-design-viewer"

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function isVariantDesignPreview(v: unknown): v is VariantDesignPreview {
  return (
    isPlainObject(v) &&
    typeof v.index === "number" &&
    typeof v.html_path === "string"
  )
}

export function isVariantDesignResult(v: unknown): v is VariantDesignResult {
  if (!isPlainObject(v)) return false
  if (!Array.isArray(v.designs)) return false
  if (
    typeof v.status !== "string" ||
    !["complete", "timed_out", "failed", "running"].includes(v.status)
  ) {
    return false
  }
  return v.designs.every(isVariantDesignPreview)
}

export function screenshotHtmlUrl(htmlPath: string): string | null {
  const base = getPiBackendBase()
  if (!base) return null
  return `${base}/screenshots/${htmlPath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`
}

const PREVIEW_VIEWPORT_WIDTH = 1280
const PREVIEW_VIEWPORT_HEIGHT = 960

function ScaledDesktopIframe({
  src,
  title,
}: {
  src: string
  title: string
}): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.25)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const update = () => {
      const w = el.clientWidth
      if (w > 0) setScale(w / PREVIEW_VIEWPORT_WIDTH)
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <div
        className="pointer-events-none absolute top-0 left-0 origin-top-left"
        style={{
          width: PREVIEW_VIEWPORT_WIDTH,
          height: PREVIEW_VIEWPORT_HEIGHT,
          transform: `scale(${scale})`,
        }}
      >
        <iframe
          src={src}
          title={title}
          width={PREVIEW_VIEWPORT_WIDTH}
          height={PREVIEW_VIEWPORT_HEIGHT}
          className="block border-0"
          sandbox="allow-same-origin allow-scripts"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  )
}

type GridProps = {
  result: VariantDesignResult
  /** Larger previews for the dedicated Design ideas tab. */
  expanded?: boolean
  /** Hide status/meta row — toolbar in the tab owns it. */
  hideMeta?: boolean
  /** When set, bookmark toggles persist via PATCH /leads/:id. */
  placeId?: string
  outputField?: string
}

export function VariantDesignGrid({
  result,
  expanded = false,
  hideMeta = false,
  placeId,
  outputField = "variant_design",
}: GridProps): React.JSX.Element {
  const qc = useQueryClient()
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const canFlag = !!placeId

  const flagMut = useMutation({
    mutationFn: async (designIndex: number) => {
      if (!placeId) throw new Error("placeId required")
      const nextDesigns = result.designs.map((design, i) =>
        i === designIndex ? { ...design, flagged: !design.flagged } : design,
      )
      const nextResult: VariantDesignResult = { ...result, designs: nextDesigns }
      return api.patchLead(placeId, { [outputField]: nextResult })
    },
    onMutate: async (designIndex) => {
      if (!placeId) return
      await qc.cancelQueries({ queryKey: ["lead", placeId] })
      const prevLead = qc.getQueryData<Lead>(["lead", placeId])
      if (!prevLead) return { prevLead: undefined }
      const nextDesigns = result.designs.map((design, i) =>
        i === designIndex ? { ...design, flagged: !design.flagged } : design,
      )
      const nextResult: VariantDesignResult = { ...result, designs: nextDesigns }
      qc.setQueryData<Lead>(["lead", placeId], {
        ...prevLead,
        dynamic: { ...prevLead.dynamic, [outputField]: nextResult },
      })
      return { prevLead }
    },
    onError: (_err, _idx, ctx) => {
      if (ctx?.prevLead && placeId) {
        qc.setQueryData(["lead", placeId], ctx.prevLead)
      }
    },
    onSuccess: (lead) => {
      if (placeId) qc.setQueryData(["lead", placeId], lead)
    },
  })

  const toggleFlag = (designIndex: number) => {
    if (!canFlag || flagMut.isPending) return
    flagMut.mutate(designIndex)
  }

  const slides = useMemo(
    () =>
      result.designs
        .map((design) => {
          const src = screenshotHtmlUrl(design.html_path)
          if (!src) return null
          return {
            src,
            label: design.title ?? `Design ${design.index + 1}`,
            flagged: !!design.flagged,
          }
        })
        .filter(
          (s): s is { src: string; label: string; flagged: boolean } =>
            s !== null,
        ),
    [result.designs],
  )

  const statusLabel =
    result.status === "complete"
      ? "Complete"
      : result.status === "timed_out"
        ? "Timed out"
        : result.status === "running"
          ? "Generating…"
          : "Failed"

  const openViewer = (index: number) => {
    setViewerIndex(index)
    setViewerOpen(true)
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {!hideMeta ? (
          <div className="flex flex-wrap items-center gap-2">
            {result.url ? (
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "font-medium text-primary underline-offset-2 hover:underline",
                  expanded ? "text-[13px]" : "text-[12px]",
                )}
              >
                Open in Variant
              </a>
            ) : null}
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                result.status === "complete"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : result.status === "running"
                    ? "bg-muted text-muted-foreground"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
              )}
            >
              {statusLabel}
            </span>
            {result.designs.length > 0 ? (
              <span className="text-muted-foreground text-[11px]">
                {result.designs.length} design
                {result.designs.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
        ) : null}

        {typeof result.error === "string" && result.error ? (
          <p className="text-destructive text-[12px]">{result.error}</p>
        ) : null}

        {result.designs.length > 0 ? (
          <motion.div
            className={cn(
              "grid gap-3",
              expanded
                ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2",
            )}
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.06 },
              },
            }}
          >
            {result.designs.map((design, i) => {
              const src = screenshotHtmlUrl(design.html_path)
              const label = design.title ?? `Design ${design.index + 1}`
              const canOpen = !!src
              const flagged = !!design.flagged

              return (
                <motion.div
                  key={`${design.html_path}-${design.index}`}
                  className="group/card relative"
                  variants={{
                    hidden: { opacity: 0, y: 12, scale: 0.98 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
                    },
                  }}
                >
                  {canFlag ? (
                    <button
                      type="button"
                      aria-label={flagged ? "Remove bookmark" : "Bookmark design"}
                      aria-pressed={flagged}
                      disabled={flagMut.isPending}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFlag(i)
                      }}
                      className={cn(
                        "absolute top-2.5 right-2.5 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full",
                        "border border-white/15 bg-black/45 text-white backdrop-blur-md",
                        "transition-all duration-200 hover:scale-105 hover:bg-black/60",
                        flagged
                          ? "opacity-100 shadow-sm shadow-primary/30"
                          : "opacity-80 group-hover/card:opacity-100 focus-visible:opacity-100 sm:opacity-0 sm:group-hover/card:opacity-100",
                      )}
                    >
                      <HugeiconsIcon
                        icon={flagged ? Bookmark01Icon : Bookmark02Icon}
                        size={16}
                        strokeWidth={flagged ? 2 : 1.75}
                        className={cn(flagged && "text-amber-300")}
                      />
                    </button>
                  ) : null}

                  <motion.button
                    type="button"
                    disabled={!canOpen}
                    onClick={() => openViewer(i)}
                    className={cn(
                      "group/card relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted/30 text-left",
                      "ring-1 ring-border/60 transition-shadow duration-300",
                      flagged && "ring-amber-500/45 ring-2",
                      canOpen &&
                        "cursor-zoom-in hover:ring-primary/40 hover:shadow-lg hover:shadow-primary/5",
                      !canOpen && "cursor-not-allowed opacity-60",
                    )}
                    whileHover={canOpen ? { scale: 1.015 } : undefined}
                    whileTap={canOpen ? { scale: 0.99 } : undefined}
                  >
                    {src ? (
                      <ScaledDesktopIframe src={src} title={label} />
                    ) : (
                      <div className="text-muted-foreground flex h-full items-center justify-center p-4 text-center text-[11px]">
                        Backend URL not configured
                      </div>
                    )}

                    {canOpen ? (
                      <div className="pointer-events-none absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/35 via-transparent to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100">
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                          View
                          <HugeiconsIcon
                            icon={ArrowExpand02Icon}
                            size={12}
                            strokeWidth={1.75}
                          />
                        </span>
                      </div>
                    ) : null}
                  </motion.button>
                </motion.div>
              )
            })}
          </motion.div>
        ) : result.status === "running" ? (
          <p className="text-muted-foreground text-[13px]">
            Generation in progress… previews appear when the job finishes.
          </p>
        ) : (
          <p className="text-muted-foreground text-[13px]">
            No design previews captured yet.
          </p>
        )}
      </div>

      <VariantDesignViewer
        slides={slides}
        index={viewerIndex}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        onIndexChange={setViewerIndex}
        onToggleFlag={canFlag ? toggleFlag : undefined}
      />
    </>
  )
}
