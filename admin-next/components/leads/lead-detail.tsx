"use client"

import * as React from "react"
import { useMemo, useState, useLayoutEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion } from "motion/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  Call02Icon,
  Image01Icon,
  Link04Icon,
  MapsLocation01Icon,
  Loading03Icon,
  StarIcon,
} from "@hugeicons/core-free-icons"

import { AiExperimenter } from "@/components/ai/ai-experimenter"
import { AiOutputCard } from "@/components/ai/ai-output-card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useFields } from "@/hooks/use-fields"
import { useLeadDetail } from "@/hooks/use-lead-detail"
import { api } from "@/lib/api"
import { getScreenshotUrl } from "@/lib/leads"
import { jobKindForTask } from "@/lib/job-kind"
import { getPiBackendBase } from "@/lib/pi-url"
import { useTrackJob } from "@/lib/store/job-toaster"
import {
  FIELD_FORMAT_STARS_1_10,
  type AiTask,
  type FieldDescriptor,
  fieldClauseKey,
  type Lead,
} from "@/lib/types"
import {
  getListingAddress,
  getListingPhone,
  getMapsUrl,
} from "@/lib/lead-contacts"
import {
  contactCounts,
  parseWebsiteContacts,
} from "@/lib/website-contacts"
import { cn } from "@/lib/utils"

import { ContactTab } from "./contact-tab"
import { CopyMapsDataButton } from "./copy-maps-data-button"
import { WebsiteContactsCard } from "./website-contacts-card"
import { InspirationTab } from "./inspiration-tab"
import { RatingEditor } from "./rating-editor"
import {
  VARIANT_DESIGN_TASK,
  VariantDesignsTab,
} from "./variant-designs-tab"
import { isVariantDesignResult } from "./variant-design-grid"

// Name of the AI task whose output drives the Inspiration tab. We hide it from
// the generic AI outputs list because its rendering is the Inspiration tab.
const INSPIRATION_QUERIES_TASK = "generate_inspiration_queries"

function variantDesignCount(lead: Lead): number {
  const raw = (lead.dynamic as Record<string, unknown> | undefined)?.variant_design
  if (!isVariantDesignResult(raw)) return 0
  return raw.designs.length
}

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type Props = {
  placeId: string
  /**
   * Optional close handler. When provided (e.g. inside the side panel),
   * the header's close button calls this instead of `router.back()`.
   */
  onClose?: () => void
  /**
   * Hide the inner header close button — used when the surrounding chrome
   * (e.g. the side panel toolbar) already owns the close affordance.
   */
  hideClose?: boolean
  /**
   * Compact single-column layout for narrow containers (e.g. the side panel).
   * Drops the experiment column and the crawl-page thumbnail strip, and tones
   * down the header.
   */
  compact?: boolean
}

// Top-level columns / dynamic keys already rendered prominently somewhere
// in this layout — skip them in the generic key/value list.
const SKIP_KEYS = new Set<string>([
  "place_id",
  "name",
  "lead_score",
  "updated_at",
  "screenshot_path",
  "crawl_pages",
  "website_contacts",
])

/**
 * Raw Google JSON keys we never surface in the lead detail digest — the full
 * blob is still on the lead for tasks/API; this list trims visual noise.
 */
const PLACE_DATA_DETAIL_SUPPRESSED_KEYS = new Set([
  "types",
  "addressComponents",
  "plusCode",
  "location",
  "viewport",
  "reviews",
  "photos",
  "paymentOptions",
  "parkingOptions",
  "addressDescriptor",
  "delivery",
  "iconMaskBaseUri",
  "iconBackgroundColor",
  "currentOpeningHours",
  "regularOpeningHours",
  "id",
  // Often mirrored by typed columns / header.
  "rating",
  "businessStatus",
  "userRatingCount",
])

/** Nicer titles for selected `data.*` keys (humanized camelCase is often wrong). */
const PLACE_DATA_DETAIL_LABEL_OVERRIDES: Record<string, string> = {
  adrFormatAddress: "Structured address",
}

function isDigestiblePlaceDataValue(v: unknown): boolean {
  if (v == null) return false
  if (
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean"
  ) {
    return true
  }
  if (Array.isArray(v)) {
    if (v.length === 0 || v.length > 5) return false
    return v.every((x) => x !== null && typeof x !== "object")
  }
  return false
}

export function LeadDetail({
  placeId,
  onClose,
  hideClose,
  compact,
}: Props): React.JSX.Element {
  const router = useRouter()
  const qc = useQueryClient()
  const leadQuery = useLeadDetail(placeId)
  const tasksQuery = useQuery<AiTask[]>({
    queryKey: ["ai-tasks"],
    queryFn: () => api.aiTasks(),
    staleTime: 60_000,
  })
  const { fields } = useFields()
  const [activeTab, setActiveTab] = useState("overview")

  if (leadQuery.isPending) return <LeadDetailSkeleton />
  if (leadQuery.isError || !leadQuery.data) {
    return (
      <ErrorState
        message={
          leadQuery.error instanceof Error
            ? leadQuery.error.message
            : "Couldn't load lead."
        }
        onRetry={() =>
          qc.invalidateQueries({ queryKey: ["lead", placeId] })
        }
      />
    )
  }

  const lead = leadQuery.data
  const tasks = tasksQuery.data ?? []
  const designIdeasCount = variantDesignCount(lead)
  const contactHitCount = contactCounts(parseWebsiteContacts(lead.dynamic)).total
  const handleClose = onClose ?? (() => router.back())
  const showFullHeader = activeTab === "overview" || activeTab === "ai"

  if (compact) {
    return (
      <div className="flex flex-col gap-5">
        <Header
          lead={lead}
          onClose={onClose ?? (() => router.back())}
          hideClose={hideClose}
          compact
        />
        <GeneralData lead={lead} fields={fields} compact />
        <AiOutputsColumn lead={lead} tasks={tasks} />
      </div>
    )
  }

  const tabPanelClass = "mt-0 flex-none outline-none"

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[1280px] px-6 pb-28 pt-4">
          {showFullHeader ? (
            <OverviewHeader
              lead={lead}
              onClose={handleClose}
              hideClose={hideClose}
              className="mb-6"
            />
          ) : null}

          <TabsContent value="overview" className={tabPanelClass}>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)] lg:items-start">
              {/* Column 1 — General data */}
              <section className="min-w-0">
                <div className="mb-3">
                  <RatingEditor placeId={lead.place_id} value={lead.lead_score} />
                </div>
                <GeneralData lead={lead} fields={fields} />
              </section>

              {/* Column 2 — AI outputs */}
              <section className="min-w-0">
                <AiOutputsColumn lead={lead} tasks={tasks} />
              </section>

              {/* Column 3 — AI experimentation (sticky) */}
              <section className="min-w-0">
                <ExperimentPanel placeId={placeId} />
              </section>
            </div>
          </TabsContent>

          <TabsContent value="ai" className={tabPanelClass}>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
              <section className="min-w-0">
                <AiOutputsColumn lead={lead} tasks={tasks} />
              </section>
              <section className="min-w-0">
                <ExperimentPanel placeId={placeId} />
              </section>
            </div>
          </TabsContent>

          <TabsContent value="inspiration" className={tabPanelClass}>
            <InspirationTab lead={lead} tasks={tasks} />
          </TabsContent>

          <TabsContent value="design-ideas" className={tabPanelClass}>
            <VariantDesignsTab lead={lead} tasks={tasks} />
          </TabsContent>

          <TabsContent value="contact" className={tabPanelClass}>
            <ContactTab lead={lead} />
          </TabsContent>
        </div>
      </div>

      <LeadDetailTabBar
        lead={lead}
        designIdeasCount={designIdeasCount}
        contactHitCount={contactHitCount}
        hideClose={hideClose}
        onClose={handleClose}
      />
    </Tabs>
  )
}

// -----------------------------------------------------------------------------
// Bottom nav chrome — shared styling for the floating tab bar & title pill.
// -----------------------------------------------------------------------------

const bottomNavShellClass =
  "border border-border bg-background/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/85"

const bottomNavPillClass = cn(bottomNavShellClass, "rounded-full")

// h-9 title track + p-1 shell padding → radius capped at half collapsed height.
const titlePillRadiusClass =
  "rounded-[calc((theme(spacing.9)+theme(spacing.2))/2)]"

// -----------------------------------------------------------------------------
// Tab bar — floats above scroll content, pinned to the tab panel bottom.
// -----------------------------------------------------------------------------

function LeadDetailTabBar({
  lead,
  designIdeasCount,
  contactHitCount,
  hideClose,
  onClose,
}: {
  lead: Lead
  designIdeasCount: number
  contactHitCount: number
  hideClose?: boolean
  onClose: () => void
}): React.JSX.Element {
  return (
    <>
      <LeadTitlePill lead={lead} hideClose={hideClose} onClose={onClose} />

      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-40 flex justify-center px-6">
        <div
          className={cn(
            bottomNavPillClass,
            "pointer-events-auto flex max-w-full items-center p-1",
          )}
        >
          <TabsList className="h-auto border-0 bg-transparent p-0 shadow-none">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contact">
              Contact
              {contactHitCount > 0 ? ` (${contactHitCount})` : ""}
            </TabsTrigger>
            <TabsTrigger value="ai">AI</TabsTrigger>
            <TabsTrigger value="design-ideas">
              Design ideas
              {designIdeasCount > 0 ? ` (${designIdeasCount})` : ""}
            </TabsTrigger>
            <TabsTrigger value="inspiration">Inspiration</TabsTrigger>
          </TabsList>
        </div>
      </div>
    </>
  )
}

// -----------------------------------------------------------------------------
// Experiment panel — fixed-height sticky column so the event stream always
// fills remaining space instead of collapsing when log output is short.
// -----------------------------------------------------------------------------

function ExperimentPanel({ placeId }: { placeId: string }): React.JSX.Element {
  return (
    <div className="lg:sticky lg:top-4 lg:flex lg:h-[calc(100dvh-8rem)] lg:max-h-[calc(100dvh-8rem)] lg:flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card p-4">
        <div className="text-muted-foreground mb-3 shrink-0 text-[11px] uppercase tracking-wide">
          Experiment
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <AiExperimenter
            mode="single"
            targetIds={[placeId]}
            allowPromptEdit
            className="flex min-h-full flex-col"
          />
        </div>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Header
// -----------------------------------------------------------------------------

function getCategory(lead: Lead): string | null {
  const types = lead.dynamic?.types
  if (Array.isArray(types) && types.length > 0) {
    return String(types[0]).replace(/_/g, " ")
  }
  const single = lead.dynamic?.category ?? lead.dynamic?.primary_category
  if (typeof single === "string" && single.trim()) return single
  return null
}

function formatBusinessStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function LeadTitlePill({
  lead,
  hideClose,
  onClose,
}: {
  lead: Lead
  hideClose?: boolean
  onClose: () => void
}): React.JSX.Element {
  const [hovered, setHovered] = useState(false)
  const [detailsHeight, setDetailsHeight] = useState(0)
  const detailsMeasureRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  const category = getCategory(lead)
  const address = getListingAddress(lead)
  const phone = getListingPhone(lead)

  const detailItems: React.ReactNode[] = []

  if (category) {
    detailItems.push(
      <span key="category" className="text-muted-foreground shrink-0 capitalize">
        {category}
      </span>,
    )
  }

  if (lead.business_status) {
    detailItems.push(
      <span
        key="status"
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium leading-none",
          lead.business_status === "OPERATIONAL"
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-destructive/10 text-destructive",
        )}
      >
        {formatBusinessStatus(lead.business_status)}
      </span>,
    )
  }

  if (address) {
    detailItems.push(
      <span
        key="address"
        className="text-muted-foreground max-w-[12rem] truncate"
        title={address}
      >
        {address}
      </span>,
    )
  }

  if (lead.rating != null) {
    detailItems.push(
      <span
        key="rating"
        className="inline-flex shrink-0 items-center gap-1 tabular-nums"
      >
        <HugeiconsIcon
          icon={StarIcon}
          size={12}
          strokeWidth={2}
          className="text-amber-500"
        />
        <span className="font-medium">{lead.rating}</span>
      </span>,
    )
  }

  if (lead.review_count != null) {
    detailItems.push(
      <span key="reviews" className="text-muted-foreground shrink-0 tabular-nums">
        {lead.review_count.toLocaleString()} review
        {lead.review_count === 1 ? "" : "s"}
      </span>,
    )
  }

  if (lead.lead_score != null) {
    detailItems.push(
      <span key="score" className="text-muted-foreground shrink-0">
        Score{" "}
        <span className="text-foreground font-medium tabular-nums">
          {lead.lead_score}
        </span>
        /10
      </span>,
    )
  }

  if (phone) {
    detailItems.push(
      <span key="phone" className="text-muted-foreground shrink-0">
        {phone}
      </span>,
    )
  }

  const detailsContent = (
    <div className="flex items-center gap-1 whitespace-nowrap px-3 pb-1 pt-2.5 text-sm leading-none">
      {detailItems.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 ? (
            <span
              className="mx-0.5 h-3.5 w-px shrink-0 bg-border/80"
              aria-hidden
            />
          ) : null}
          {item}
        </React.Fragment>
      ))}
    </div>
  )

  const showDetails = hovered && detailItems.length > 0

  useLayoutEffect(() => {
    const node = detailsMeasureRef.current
    if (!node) return
    setDetailsHeight(node.scrollHeight)
  }, [
    detailItems.length,
    lead.place_id,
    category,
    address,
    phone,
    lead.business_status,
    lead.rating,
    lead.review_count,
    lead.lead_score,
  ])

  const layoutSpring = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 460, damping: 36, mass: 0.82 }

  const revealEase = [0.22, 1, 0.36, 1] as const

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 z-40 flex items-end justify-start px-6">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: reduceMotion ? 0 : 0.28,
          ease: revealEase,
        }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        className={cn(
          "pointer-events-auto relative flex w-max max-w-[min(90vw,48rem)] flex-col overflow-hidden p-1",
          bottomNavShellClass,
          titlePillRadiusClass,
        )}
      >
        <motion.div
          className="overflow-hidden"
          initial={false}
          animate={{
            height: showDetails ? detailsHeight : 0,
            opacity: showDetails ? 1 : 0,
          }}
          transition={layoutSpring}
        >
          {detailsContent}
        </motion.div>

        <div
          className={cn(
            "flex h-9 items-center gap-0.5 pl-3",
            hideClose ? "pr-3" : "pr-1",
          )}
        >
          <span
            className={cn(
              "min-w-0 text-sm font-medium leading-none",
              !hovered && "max-w-[min(14rem,35vw)] truncate",
            )}
          >
            {lead.name}
          </span>

          {!hideClose ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={onClose}
                  aria-label="Close"
                  className="shrink-0"
                >
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    size={14}
                    strokeWidth={1.75}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close</TooltipContent>
            </Tooltip>
          ) : null}
        </div>

        <div
          ref={detailsMeasureRef}
          className="pointer-events-none invisible absolute top-0 left-0"
          aria-hidden
        >
          {detailsContent}
        </div>
      </motion.div>
    </div>
  )
}

function Header({
  lead,
  onClose,
  hideClose,
  compact,
}: {
  lead: Lead
  onClose: () => void
  hideClose?: boolean
  compact?: boolean
}): React.JSX.Element {
  const category = getCategory(lead)

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1
          className={cn(
            "font-semibold leading-tight",
            compact ? "text-base" : "text-2xl",
          )}
        >
          {lead.name}
        </h1>
        <div
          className={cn(
            "text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2",
            compact ? "text-[12px]" : "text-sm",
          )}
        >
          {category ? <span>{category}</span> : null}
          {category && lead.business_status ? (
            <span className="opacity-50">·</span>
          ) : null}
          {lead.business_status ? (
            <span
              className={cn(
                lead.business_status !== "OPERATIONAL" && "text-destructive",
              )}
            >
              {lead.business_status}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <LeadQuickActions lead={lead} />

        <div className="ml-2">
          <RatingEditor placeId={lead.place_id} value={lead.lead_score} />
        </div>

        {!hideClose && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                aria-label="Close"
              >
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  size={16}
                  strokeWidth={1.75}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Close</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}

function OverviewHeader({
  lead,
  onClose,
  hideClose,
  className,
}: {
  lead: Lead
  onClose: () => void
  hideClose?: boolean
  className?: string
}): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex items-center gap-2",
        lead.business_status ? "justify-between" : "justify-end",
        className,
      )}
    >
      {lead.business_status ? (
        <div className="text-muted-foreground text-sm">
          <span
            className={cn(
              lead.business_status !== "OPERATIONAL" && "text-destructive",
            )}
          >
            {lead.business_status}
          </span>
        </div>
      ) : null}

      <div className="flex items-center gap-1">
        <LeadQuickActions lead={lead} />

        {!hideClose ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                aria-label="Close"
              >
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  size={16}
                  strokeWidth={1.75}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Close</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  )
}

function LeadQuickActions({ lead }: { lead: Lead }): React.JSX.Element {
  const phone = getListingPhone(lead)
  const mapsUrl = getMapsUrl(lead)

  return (
    <>
      <CopyMapsDataButton lead={lead} variant="icon" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" asChild>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open in Maps"
            >
              <HugeiconsIcon
                icon={MapsLocation01Icon}
                size={16}
                strokeWidth={1.75}
              />
            </a>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Open in Maps</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!lead.website}
              asChild={!!lead.website}
            >
              {lead.website ? (
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Visit website"
                >
                  <HugeiconsIcon
                    icon={Link04Icon}
                    size={16}
                    strokeWidth={1.75}
                  />
                </a>
              ) : (
                <HugeiconsIcon icon={Link04Icon} size={16} strokeWidth={1.75} />
              )}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {lead.website ? "Visit website" : "No website"}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!phone}
              asChild={!!phone}
            >
              {phone ? (
                <a href={`tel:${phone}`} aria-label={`Call ${phone}`}>
                  <HugeiconsIcon
                    icon={Call02Icon}
                    size={16}
                    strokeWidth={1.75}
                  />
                </a>
              ) : (
                <HugeiconsIcon
                  icon={Call02Icon}
                  size={16}
                  strokeWidth={1.75}
                />
              )}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{phone ?? "No phone"}</TooltipContent>
      </Tooltip>
    </>
  )
}

// -----------------------------------------------------------------------------
// Column 1 — General data
// -----------------------------------------------------------------------------

function GeneralData({
  lead,
  fields,
  compact,
}: {
  lead: Lead
  fields: FieldDescriptor[]
  compact?: boolean
}): React.JSX.Element {
  const screenshotUrl = getScreenshotUrl(lead)
  const [shotFailed, setShotFailed] = useState(false)
  const crawlPages = Array.isArray(lead.dynamic?.crawl_pages)
    ? (lead.dynamic.crawl_pages as unknown[])
    : null

  // Build a set of present keys: top-level columns + dynamic.* + data.* keys.
  // In compact mode, skip slim cols already shown in the header (business_status)
  // or in the stats strip above (rating, review_count).
  const rows = useMemo(() => {
    const out: Array<{ key: string; value: unknown; meta?: FieldDescriptor }> =
      []
    const lookup = new Map<string, FieldDescriptor>()
    for (const f of fields) {
      lookup.set(fieldClauseKey(f), f)
    }

    const slimCols: Array<keyof Lead> = compact
      ? ["website"]
      : ["rating", "review_count", "website", "business_status"]
    for (const k of slimCols) {
      if (SKIP_KEYS.has(k as string)) continue
      const v = (lead as unknown as Record<string, unknown>)[k as string]
      if (v == null || v === "") continue
      out.push({ key: k as string, value: v, meta: lookup.get(k as string) })
    }

    // Dynamic keys.
    const dyn = lead.dynamic ?? {}
    for (const [k, v] of Object.entries(dyn)) {
      if (SKIP_KEYS.has(k)) continue
      if (v == null || v === "") continue
      out.push({
        key: k,
        value: v,
        meta: lookup.get(`dynamic.${k}`),
      })
    }

    // Raw import / Google JSON (`places.data`).
    const placeData =
      lead.data && typeof lead.data === "object" && !Array.isArray(lead.data)
        ? (lead.data as Record<string, unknown>)
        : {}
    for (const [k, v] of Object.entries(placeData)) {
      if (SKIP_KEYS.has(k)) continue
      if (PLACE_DATA_DETAIL_SUPPRESSED_KEYS.has(k)) continue
      if (v == null || v === "") continue
      if (!isDigestiblePlaceDataValue(v)) continue
      out.push({
        key: `data.${k}`,
        value: v,
        meta: lookup.get(`data.${k}`),
      })
    }
    return out
  }, [lead, fields, compact])

  return (
    <div className={cn("flex flex-col", compact ? "gap-3" : "gap-4")}>
      {compact ? <StatsStrip lead={lead} /> : null}

      {/* Screenshot hero */}
      <div className="relative">
        {screenshotUrl && !shotFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={screenshotUrl}
            alt={`${lead.name} screenshot`}
            onError={() => setShotFailed(true)}
            className="aspect-[16/10] w-full cursor-zoom-in rounded-xl border bg-muted/30 object-cover object-top shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-pop)]"
            // TODO: clicking should open a lightbox; deferred for v1.
          />
        ) : (
          <div className="text-muted-foreground flex aspect-[16/10] w-full items-center justify-center rounded-xl border bg-gradient-to-br from-muted/40 to-muted/10">
            <HugeiconsIcon
              icon={Image01Icon}
              size={20}
              strokeWidth={1.25}
              className="opacity-40"
            />
            <span className="ml-2 text-[12px]">No screenshot</span>
          </div>
        )}
      </div>

      {compact ? <WebsiteContactsCard lead={lead} compact={compact} /> : null}

      {/* Crawl-page thumbnail strip */}
      {crawlPages && crawlPages.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto">
          {crawlPages.map((page, i) => {
            const p =
              typeof page === "object" && page !== null
                ? (page as { screenshot_path?: unknown; url?: unknown })
                : null
            const path =
              typeof p?.screenshot_path === "string" ? p.screenshot_path : null
            const base = getPiBackendBase()
            const url =
              path && base
                ? `${base}/screenshots/${encodeURIComponent(path)}`
                : null
            return (
              <div
                key={i}
                className={cn(
                  "aspect-[16/10] shrink-0 cursor-pointer overflow-hidden rounded border bg-muted/30",
                  compact ? "h-12" : "h-16",
                )}
                title={typeof p?.url === "string" ? p.url : undefined}
                // TODO: clicking should open a lightbox; deferred for v1.
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover object-top"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = "none"
                    }}
                  />
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Key/value list */}
      <dl
        className={cn(
          compact ? "grid grid-cols-2 gap-2" : "flex flex-col gap-3",
        )}
      >
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No additional fields.</p>
        ) : (
          rows.map(({ key, value, meta }) => (
            <KeyValueRow
              key={key}
              label={detailFieldLabel(key, meta)}
              value={value}
              format={meta?.format}
              compact={compact}
              wide={compact && isLongValue(value)}
            />
          ))
        )}
      </dl>
    </div>
  )
}

// -----------------------------------------------------------------------------
// StatsStrip — compact-mode chip for rating + review count
// -----------------------------------------------------------------------------

function StatsStrip({ lead }: { lead: Lead }): React.JSX.Element | null {
  const rating = lead.rating
  const reviews = lead.review_count
  if (rating == null && reviews == null) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-1 leading-none">
        {rating != null ? (
          <>
            <HugeiconsIcon
              icon={StarIcon}
              size={11}
              strokeWidth={2}
              className="text-amber-500"
            />
            <span className="font-medium tabular-nums">{rating}</span>
          </>
        ) : null}
        {rating != null && reviews != null ? (
          <span className="text-muted-foreground">·</span>
        ) : null}
        {reviews != null ? (
          <span className="text-muted-foreground tabular-nums">
            {reviews} review{reviews === 1 ? "" : "s"}
          </span>
        ) : null}
      </span>
    </div>
  )
}

function isLongValue(v: unknown): boolean {
  if (v == null) return false
  if (typeof v === "boolean" || typeof v === "number") return false
  if (typeof v === "string") return v.length > 40 || v.includes("\n")
  return true // arrays, objects render as <details> or wrapped pre — span full width
}

function prettyKey(k: string): string {
  return k
    .replace(/_/g, " ")
    .replace(/\bid\b/i, "ID")
    .replace(/\burl\b/i, "URL")
    .replace(/^./, (c) => c.toUpperCase())
}

function humanizeCamelKey(segment: string): string {
  const spaced = segment
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
  return spaced
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.toLowerCase() === "id" ? "ID" : w))
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

function detailFieldLabel(key: string, meta?: FieldDescriptor): string {
  const d = meta?.display?.trim()
  if (d) return d
  if (key.startsWith("data.")) {
    const seg = key.slice(5)
    const ovr = PLACE_DATA_DETAIL_LABEL_OVERRIDES[seg]
    if (ovr) return ovr
    return humanizeCamelKey(seg)
  }
  if (key.startsWith("dynamic.")) return prettyKey(key.slice(8))
  return prettyKey(key)
}

function looksLikeHtmlSnippet(s: string): boolean {
  return /<\/[a-z][\s\S]*?>|<[a-z][\s\S]*?>/i.test(s)
}

/** Strip tags for Google-style microformatted strings (e.g. adrFormatAddress). */
function htmlToPlainText(html: string): string {
  const trimmed = html.trim()
  if (!trimmed) return ""
  if (typeof document !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(trimmed, "text/html")
      const text = doc.body.textContent ?? ""
      const normalized = text.replace(/\s+/g, " ").trim()
      if (normalized) return normalized
    } catch {
      /* fall through */
    }
  }
  return trimmed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

// -----------------------------------------------------------------------------
// KeyValueRow
// -----------------------------------------------------------------------------

function KeyValueRow({
  label,
  value,
  format,
  compact,
  wide,
}: {
  label: string
  value: unknown
  format?: string
  compact?: boolean
  wide?: boolean
}): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1",
        compact
          ? "rounded-md border border-border/60 bg-muted/20 px-2.5 py-2"
          : "border-b border-border/60 pb-3 last:border-b-0 last:pb-0",
        wide && "col-span-2",
      )}
    >
      <dt
        className={cn(
          "font-medium text-muted-foreground",
          compact ? "text-[10px]" : "text-[11px]",
        )}
      >
        {label}
      </dt>
      <dd className={cn("min-w-0", compact ? "text-[12.5px]" : "text-[13px]")}>
        <ValueRenderer value={value} format={format} />
      </dd>
    </div>
  )
}

function ValueRenderer({
  value,
  format,
}: {
  value: unknown
  format?: string
}): React.JSX.Element {
  // Format hooks first.
  if (format === FIELD_FORMAT_STARS_1_10 && typeof value === "number") {
    return (
      <span className="inline-flex items-center gap-1">
        <span>{value}</span>
        <HugeiconsIcon icon={StarIcon} size={12} strokeWidth={1.75} />
      </span>
    )
  }

  if (typeof value === "boolean") {
    return (
      <span className={value ? "text-emerald-500" : "text-muted-foreground"}>
        {value ? "Yes" : "No"}
      </span>
    )
  }

  if (typeof value === "number") {
    return <span>{value}</span>
  }

  if (typeof value === "string") {
    const display = looksLikeHtmlSnippet(value) ? htmlToPlainText(value) : value
    if (
      display.startsWith("http://") ||
      display.startsWith("https://")
    ) {
      return (
        <a
          href={display}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline-offset-2 hover:underline break-all"
        >
          {display}
        </a>
      )
    }
    return <LongString value={display} />
  }

  if (Array.isArray(value)) {
    const isShort = value.length <= 6 && value.every((v) => typeof v !== "object")
    if (isShort) {
      return <span>{value.map((v) => String(v)).join(", ")}</span>
    }
    return (
      <details className="text-[12.5px]">
        <summary className="text-muted-foreground cursor-pointer">
          {value.length} item{value.length === 1 ? "" : "s"}
        </summary>
        <pre className="bg-muted/30 mt-1 max-h-64 overflow-auto rounded-md p-2 font-mono text-[11.5px]">
          {safeStringify(value)}
        </pre>
      </details>
    )
  }

  if (value && typeof value === "object") {
    return (
      <details className="text-[12.5px]">
        <summary className="text-muted-foreground cursor-pointer">Object</summary>
        <pre className="bg-muted/30 mt-1 max-h-64 overflow-auto rounded-md p-2 font-mono text-[11.5px]">
          {safeStringify(value)}
        </pre>
      </details>
    )
  }

  if (value == null) {
    return <span className="text-muted-foreground italic">—</span>
  }

  return <span>{String(value)}</span>
}

function LongString({ value }: { value: string }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const isLong = value.length > 240 || value.split("\n").length > 4
  if (!isLong) {
    return <p className="whitespace-pre-wrap">{value}</p>
  }
  return (
    <div>
      <p
        className={cn("whitespace-pre-wrap", !open && "line-clamp-3")}
      >
        {value}
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground mt-1 text-[11px] underline-offset-2 hover:underline"
      >
        {open ? "Show less" : "Show more"}
      </button>
    </div>
  )
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

// -----------------------------------------------------------------------------
// Column 2 — AI outputs
// -----------------------------------------------------------------------------

function AiOutputsColumn({
  lead,
  tasks,
}: {
  lead: Lead
  tasks: AiTask[]
}): React.JSX.Element {
  const qc = useQueryClient()
  const trackJob = useTrackJob()
  const rerunMut = useMutation({
    mutationFn: async (task: AiTask) => {
      const kind = jobKindForTask(task)
      return api.startJob(kind, {
        task: task.name,
        place_ids: [lead.place_id],
      })
    },
    onSuccess: (res, task) => {
      // Push the running job into the bottom-right overlay so the user can
      // watch progress / logs while the lead data refreshes in the background.
      const kind = jobKindForTask(task)
      trackJob(res.id, {
        title: `${task.label || task.name} · ${lead.name}`,
        kind,
      })
      // Backend SSE will update fields later — invalidate to refetch soon.
      qc.invalidateQueries({ queryKey: ["lead", lead.place_id] })
    },
  })

  const visibleTasks = tasks.filter(
    (t) =>
      t.name !== INSPIRATION_QUERIES_TASK &&
      t.name !== VARIANT_DESIGN_TASK &&
      t.task_type !== "variant",
  )

  if (visibleTasks.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No AI tasks defined.</p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {visibleTasks.map((task) => {
        const field =
          (task.config.output_field as string | undefined) ?? task.name
        const output = (lead.dynamic as Record<string, unknown> | undefined)?.[
          field
        ]
        const isRerunning =
          rerunMut.isPending && rerunMut.variables?.name === task.name
        return (
          <div key={task.name} className="relative">
            <AiOutputCard
              task={task}
              output={output}
              placeId={lead.place_id}
              outputField={field}
              onRerun={() => rerunMut.mutate(task)}
            />
            {isRerunning ? (
              <div className="bg-background/60 absolute inset-0 flex items-center justify-center rounded-lg">
                <HugeiconsIcon
                  icon={Loading03Icon}
                  size={16}
                  className="animate-spin"
                />
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Loading / error states
// -----------------------------------------------------------------------------

function LeadDetailSkeleton(): React.JSX.Element {
  return (
    <div className="mx-auto w-full max-w-[1280px] animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-56 rounded bg-muted/50" />
          <div className="h-3 w-32 rounded bg-muted/40" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-8 rounded-full bg-muted/40" />
          <div className="h-8 w-8 rounded-full bg-muted/40" />
          <div className="h-8 w-8 rounded-full bg-muted/40" />
          <div className="h-8 w-14 rounded-full bg-muted/40" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="aspect-[16/10] w-full rounded-md bg-muted/40" />
            <div className="h-3 w-3/4 rounded bg-muted/40" />
            <div className="h-3 w-2/3 rounded bg-muted/40" />
            <div className="h-3 w-1/2 rounded bg-muted/40" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}): React.JSX.Element {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg border bg-card p-6 text-center">
      <p className="text-[13px]">Couldn&apos;t load lead.</p>
      <p className="text-muted-foreground text-[12px]">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}
