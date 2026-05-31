"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  Globe02Icon,
  Image01Icon,
  SparklesIcon,
  StarIcon,
  UserGroupIcon,
  WebDesign01Icon,
} from "@hugeicons/core-free-icons"

import {
  buildPipelineSteps,
  computeFieldCoverage,
  computeLeadStats,
  fieldExistsHref,
  resolveVisualRatingKey,
  statFilterHref,
  type ScoreBucket,
  type LeadStatsSnapshot,
} from "@/lib/lead-stats"
import { leadScoreHeatStyle } from "@/lib/lead-score-heat"
import { useJobs } from "@/hooks/use-jobs"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { FieldDescriptor, Job, SlimLead } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  rows: SlimLead[]
  fields: FieldDescriptor[]
  isLoading: boolean
}

const SCORE_BUCKETS: ScoreBucket[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

type KpiDef = {
  id: string
  label: string
  icon: typeof UserGroupIcon
  getCount: (s: LeadStatsSnapshot) => number
  /** CSS color value, used inline */
  color: string
}

const KPI_CARDS: KpiDef[] = [
  {
    id: "total",
    label: "Total leads",
    icon: UserGroupIcon,
    getCount: (s) => s.total,
    color: "var(--chart-1)",
  },
  {
    id: "website",
    label: "With website",
    icon: Globe02Icon,
    getCount: (s) => s.withWebsite,
    color: "var(--chart-2)",
  },
  {
    id: "scraped",
    label: "Scraped",
    icon: Image01Icon,
    getCount: (s) => s.scraped,
    color: "var(--chart-3)",
  },
  {
    id: "visual",
    label: "Visual score",
    icon: SparklesIcon,
    getCount: (s) => s.visualScore,
    color: "var(--chart-4)",
  },
  {
    id: "brief",
    label: "Design brief",
    icon: WebDesign01Icon,
    getCount: (s) => s.designBrief,
    color: "var(--chart-5)",
  },
  {
    id: "rated",
    label: "User rated",
    icon: StarIcon,
    getCount: (s) => s.userRated,
    color: "var(--info)",
  },
]

const FUNNEL_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--info)",
]

function pct(count: number, total: number): number {
  if (total === 0) return 0
  return Math.round((count / total) * 100)
}

function formatAvg(n: number | null): string {
  if (n == null) return "—"
  return n.toFixed(1)
}

/** Bucket job timestamps into the last 24 hours (1h buckets). */
function bucketLast24h(timestamps: Array<string | null | undefined>): number[] {
  const now = Date.now()
  const buckets = new Array(24).fill(0) as number[]
  for (const ts of timestamps) {
    if (!ts) continue
    const t = Date.parse(ts)
    if (!Number.isFinite(t)) continue
    const ageMs = now - t
    if (ageMs < 0 || ageMs >= 24 * 3600 * 1000) continue
    const hourIdx = 23 - Math.floor(ageMs / (3600 * 1000))
    if (hourIdx >= 0 && hourIdx < 24) buckets[hourIdx] += 1
  }
  return buckets
}

function isFinishedToday(job: Job): boolean {
  if (!job.finished_at) return false
  const t = new Date(job.finished_at)
  if (Number.isNaN(t.getTime())) return false
  const now = new Date()
  return (
    t.getFullYear() === now.getFullYear() &&
    t.getMonth() === now.getMonth() &&
    t.getDate() === now.getDate()
  )
}

function isFinishedWithin24h(job: Job): boolean {
  if (!job.finished_at) return false
  const t = Date.parse(job.finished_at)
  if (!Number.isFinite(t)) return false
  return Date.now() - t < 24 * 3600 * 1000
}

export function OverviewDashboard({ rows, fields, isLoading }: Props) {
  const visualKey = useMemo(() => resolveVisualRatingKey(fields), [fields])

  const stats = useMemo(
    () => computeLeadStats(rows, fields),
    [rows, fields],
  )

  const pipeline = useMemo(() => buildPipelineSteps(stats), [stats])

  const fieldCoverage = useMemo(
    () => computeFieldCoverage(rows, fields),
    [rows, fields],
  )

  const { data: activeJobs } = useJobs(["running", "queued"])
  const { data: historyJobs } = useJobs(["done", "failed", "cancelled"])

  const [hoveredStep, setHoveredStep] = useState<string | null>(null)

  const liveStats = useMemo(() => {
    const active = activeJobs ?? []
    const history = historyJobs ?? []
    const doneToday = history.filter(
      (j) => j.status === "done" && isFinishedToday(j),
    )
    const errors24h = history.filter(
      (j) => j.status === "failed" && isFinishedWithin24h(j),
    )

    return {
      activeCount: active.length,
      doneTodayCount: doneToday.length,
      errors24hCount: errors24h.length,
      activeSpark: bucketLast24h(active.map((j) => j.started_at ?? j.created_at)),
      doneSpark: bucketLast24h(doneToday.map((j) => j.finished_at)),
      errorSpark: bucketLast24h(errors24h.map((j) => j.finished_at)),
    }
  }, [activeJobs, historyJobs])

  if (isLoading) {
    return <OverviewSkeleton />
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
            Overview
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            <span className="tabular-nums">{stats.total}</span>{" "}
            {stats.total === 1 ? "lead" : "leads"} in your pipeline
            {stats.avgRating != null && (
              <>
                {" "}
                · avg Google rating{" "}
                <span className="tabular-nums">
                  {formatAvg(stats.avgRating)}
                </span>
              </>
            )}
            {stats.avgLeadScore != null && (
              <>
                {" "}
                · avg your score{" "}
                <span className="tabular-nums">
                  {formatAvg(stats.avgLeadScore)}
                </span>
              </>
            )}
          </p>
        </div>
        <Link
          href="/leads"
          className="text-[12px] text-primary hover:underline"
        >
          Open leads list →
        </Link>
      </header>

      <section aria-label="Right now">
        <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="grid gap-6 sm:grid-cols-3">
            <LiveStat
              label="Running now"
              count={liveStats.activeCount}
              color="var(--info)"
              sparkColor="var(--chart-1)"
              spark={liveStats.activeSpark}
              showLiveDot={liveStats.activeCount > 0}
              sub={
                liveStats.activeCount > 0
                  ? `${liveStats.activeCount} active job${liveStats.activeCount === 1 ? "" : "s"}`
                  : "Idle"
              }
            />
            <LiveStat
              label="Done today"
              count={liveStats.doneTodayCount}
              color="var(--success)"
              sparkColor="var(--success)"
              spark={liveStats.doneSpark}
              sub="completed since midnight"
            />
            <LiveStat
              label="Errors 24h"
              count={liveStats.errors24hCount}
              color={
                liveStats.errors24hCount > 0
                  ? "var(--destructive)"
                  : "var(--muted-foreground)"
              }
              sparkColor="var(--destructive)"
              spark={liveStats.errorSpark}
              sub={
                liveStats.errors24hCount > 0
                  ? "failed jobs in last 24h"
                  : "no failures"
              }
            />
          </div>
        </div>
      </section>

      <section aria-label="Key metrics">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {KPI_CARDS.map((kpi) => {
            const count = kpi.getCount(stats)
            const percent = pct(count, stats.total)
            const href =
              kpi.id === "total" ? "/leads" : statFilterHref(kpi.id, visualKey)
            const inner = (
              <>
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.18)]"
                  style={{ background: kpi.color }}
                >
                  <HugeiconsIcon
                    icon={kpi.icon}
                    size={14}
                    strokeWidth={2}
                    className="text-white"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[11px] font-medium text-muted-foreground">
                    {kpi.label}
                  </span>
                  <span className="flex items-baseline gap-1 text-[24px] font-semibold leading-tight tabular-nums text-foreground">
                    {count}
                    {kpi.id !== "total" && stats.total > 0 ? (
                      <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                        {percent}%
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className="relative h-9 w-1.5 shrink-0 overflow-hidden rounded-full bg-muted">
                  <div
                    className="absolute bottom-0 left-0 w-full rounded-full transition-all"
                    style={{
                      height: `${percent}%`,
                      background: kpi.color,
                    }}
                  />
                </div>
              </>
            )
            const className =
              "card-interactive flex h-[76px] items-center gap-3 rounded-xl border bg-card p-3.5 shadow-[var(--shadow-card)]"

            if (href) {
              return (
                <Link key={kpi.id} href={href} className={className}>
                  {inner}
                </Link>
              )
            }
            return (
              <div key={kpi.id} className={className}>
                {inner}
              </div>
            )
          })}
        </div>
      </section>

      <section aria-label="Enrichment pipeline">
        <h2 className="mb-3 text-[13px] font-semibold text-foreground">
          Enrichment pipeline
        </h2>
        <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="flex h-3 overflow-hidden rounded-full">
            {pipeline.map((step, i) => (
              <div
                key={step.id}
                title={`${step.label}: ${step.count}`}
                onMouseEnter={() => setHoveredStep(step.id)}
                onMouseLeave={() => setHoveredStep(null)}
                className="h-full min-w-[2px]"
                style={{
                  flex: Math.max(step.count, 0.001),
                  background: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
                  opacity:
                    hoveredStep && hoveredStep !== step.id ? 0.35 : 1,
                  transition: "opacity 200ms, flex 200ms",
                }}
              />
            ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {pipeline.map((step) => {
              const href =
                step.id === "total"
                  ? "/leads"
                  : statFilterHref(step.id, visualKey)
              const dim = hoveredStep && hoveredStep !== step.id
              const content = (
                <>
                  <span className="text-[11px] text-muted-foreground">
                    {step.label}
                  </span>
                  <span className="text-[15px] font-semibold tabular-nums">
                    {step.count}
                  </span>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {pct(step.count, stats.total)}%
                  </span>
                </>
              )
              const cardStyle = {
                opacity: dim ? 0.35 : 1,
                transition: "opacity 200ms",
              } as const

              if (href) {
                return (
                  <Link
                    key={step.id}
                    href={href}
                    onMouseEnter={() => setHoveredStep(step.id)}
                    onMouseLeave={() => setHoveredStep(null)}
                    style={cardStyle}
                    className="flex flex-col gap-0.5 rounded-md px-2 py-1.5 transition-colors duration-200 hover:bg-accent/50"
                  >
                    {content}
                  </Link>
                )
              }
              return (
                <div
                  key={step.id}
                  onMouseEnter={() => setHoveredStep(step.id)}
                  onMouseLeave={() => setHoveredStep(null)}
                  style={cardStyle}
                  className="flex flex-col gap-0.5 px-2 py-1.5"
                >
                  {content}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section aria-label="Score distributions">
        <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <Tabs defaultValue="lead">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[13px] font-semibold text-foreground">
                Score distribution
              </h2>
              <TabsList>
                <TabsTrigger value="lead">Your score</TabsTrigger>
                <TabsTrigger value="visual">Visual rating</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="lead" className="mt-3">
              <ScoreHistogram
                subtitle={`${stats.userRated} rated leads`}
                buckets={stats.leadScoreBuckets}
                useHeat
              />
            </TabsContent>
            <TabsContent value="visual" className="mt-3">
              <ScoreHistogram
                subtitle={`${stats.visualScore} with visual score`}
                buckets={stats.visualRatingBuckets}
              />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {fieldCoverage.length > 0 && (
        <section aria-label="Dynamic field coverage">
          <details className="group rounded-xl border bg-card shadow-[var(--shadow-card)]">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[13px] font-semibold text-foreground transition-colors duration-200 hover:bg-accent/30 [&::-webkit-details-marker]:hidden">
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={14}
                strokeWidth={1.75}
                className="text-muted-foreground transition-transform duration-200 group-open:rotate-90"
              />
              <span>
                Dynamic fields{" "}
                <span className="tabular-nums text-muted-foreground">
                  ({fieldCoverage.length})
                </span>
              </span>
            </summary>
            <div className="overflow-hidden border-t">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b bg-muted/30 text-[11px] text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Field</th>
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 text-right font-medium">Count</th>
                    <th className="min-w-[140px] px-4 py-2 font-medium">
                      Coverage
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {fieldCoverage.map((row) => {
                    const href = fieldExistsHref(row.key)
                    return (
                      <tr
                        key={row.key}
                        className="border-b last:border-0"
                      >
                        <td className="px-4 py-2.5">
                          {href ? (
                            <Link
                              href={href}
                              className="font-medium text-foreground transition-colors duration-200 hover:text-primary hover:underline"
                            >
                              {row.label}
                            </Link>
                          ) : (
                            <span className="font-medium text-foreground">
                              {row.label}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
                          {row.type}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {row.count}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.round(row.percent * 100)}%`,
                                  background: "var(--chart-1)",
                                }}
                              />
                            </div>
                            <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                              {pct(row.count, stats.total)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </details>
        </section>
      )}
    </div>
  )
}

function LiveStat({
  label,
  count,
  color,
  sparkColor,
  spark,
  sub,
  showLiveDot,
}: {
  label: string
  count: number
  color: string
  sparkColor: string
  spark: number[]
  sub: string
  showLiveDot?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        {showLiveDot && <span className="live-dot" />}
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <div
        className="text-[32px] font-semibold leading-none tabular-nums"
        style={{ color }}
      >
        {count}
      </div>
      <Sparkline values={spark} color={sparkColor} />
      <span className="text-[11px] tabular-nums text-muted-foreground">
        {sub}
      </span>
    </div>
  )
}

function Sparkline({
  values,
  color,
}: {
  values: number[]
  color: string
}) {
  const max = Math.max(1, ...values)
  const hasData = values.some((v) => v > 0)
  // Static placeholder fades from full color to transparent when no data.
  const display = hasData
    ? values
    : Array.from({ length: 24 }, (_, i) => 24 - i)
  const displayMax = Math.max(1, ...display)
  const bars = 24
  const gap = 1
  // Use viewBox so we scale to width:100%
  const totalGap = gap * (bars - 1)
  const vbWidth = 100
  const barWidth = (vbWidth - totalGap) / bars
  const height = 24

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${vbWidth} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      {display.map((v, i) => {
        const h = Math.max(1, (v / (hasData ? max : displayMax)) * height)
        const x = i * (barWidth + gap)
        const y = height - h
        // For placeholder, fade opacity left-to-right
        const opacity = hasData ? 1 : (i + 1) / bars
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={h}
            fill={color}
            opacity={opacity}
            rx={0.5}
          />
        )
      })}
    </svg>
  )
}

function ScoreHistogram({
  subtitle,
  buckets,
  useHeat,
}: {
  subtitle: string
  buckets: Record<ScoreBucket, number>
  useHeat?: boolean
}) {
  const max = Math.max(1, ...SCORE_BUCKETS.map((b) => buckets[b]))

  return (
    <div>
      <p className="text-[11px] tabular-nums text-muted-foreground">
        {subtitle}
      </p>
      <div className="mt-4 flex items-end gap-1.5 h-28">
        {SCORE_BUCKETS.map((score) => {
          const count = buckets[score]
          const heightPct = (count / max) * 100
          const heat = useHeat ? leadScoreHeatStyle(score) : undefined
          return (
            <div
              key={score}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <span className="text-[9px] tabular-nums text-muted-foreground">
                {count > 0 ? count : ""}
              </span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className={cn(
                    "w-full min-h-[2px] rounded-t-sm transition-all duration-200",
                    !useHeat && "bg-chart-1",
                  )}
                  style={{
                    height: `${Math.max(heightPct, count > 0 ? 6 : 0)}%`,
                    ...(heat ?? {}),
                  }}
                />
              </div>
              <span className="text-[9px] tabular-nums text-muted-foreground">
                {score}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="space-y-2">
        <div className="h-7 w-32 animate-pulse rounded bg-muted/50" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted/40" />
      </div>
      <div className="h-[120px] animate-pulse rounded-xl border bg-muted/20" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg border bg-muted/20"
          />
        ))}
      </div>
      <div className="h-24 animate-pulse rounded-xl border bg-muted/20" />
      <div className="h-56 animate-pulse rounded-xl border bg-muted/20" />
    </div>
  )
}
