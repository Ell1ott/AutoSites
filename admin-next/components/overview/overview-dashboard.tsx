"use client"

import Link from "next/link"
import { useMemo } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
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
import type { FieldDescriptor, SlimLead } from "@/lib/types"
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
  accent: string
}

const KPI_CARDS: KpiDef[] = [
  {
    id: "total",
    label: "Total leads",
    icon: UserGroupIcon,
    getCount: (s) => s.total,
    accent: "bg-primary/80",
  },
  {
    id: "website",
    label: "With website",
    icon: Globe02Icon,
    getCount: (s) => s.withWebsite,
    accent: "bg-chart-2",
  },
  {
    id: "scraped",
    label: "Scraped",
    icon: Image01Icon,
    getCount: (s) => s.scraped,
    accent: "bg-chart-3",
  },
  {
    id: "visual",
    label: "Visual score",
    icon: SparklesIcon,
    getCount: (s) => s.visualScore,
    accent: "bg-chart-4",
  },
  {
    id: "brief",
    label: "Design brief",
    icon: WebDesign01Icon,
    getCount: (s) => s.designBrief,
    accent: "bg-chart-5",
  },
  {
    id: "rated",
    label: "User rated",
    icon: StarIcon,
    getCount: (s) => s.userRated,
    accent: "bg-chart-1",
  },
]

function pct(count: number, total: number): number {
  if (total === 0) return 0
  return Math.round((count / total) * 100)
}

function formatAvg(n: number | null): string {
  if (n == null) return "—"
  return n.toFixed(1)
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

  if (isLoading) {
    return <OverviewSkeleton />
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
            Overview
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {stats.total} {stats.total === 1 ? "lead" : "leads"} in your
            pipeline
            {stats.avgRating != null && (
              <>
                {" "}
                · avg Google rating {formatAvg(stats.avgRating)}
              </>
            )}
            {stats.avgLeadScore != null && (
              <>
                {" "}
                · avg your score {formatAvg(stats.avgLeadScore)}
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

      <section aria-label="Key metrics">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {KPI_CARDS.map((kpi) => {
            const count = kpi.getCount(stats)
            const percent = pct(count, stats.total)
            const href =
              kpi.id === "total" ? "/leads" : statFilterHref(kpi.id, visualKey)
            const inner = (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {kpi.label}
                  </span>
                  <HugeiconsIcon
                    icon={kpi.icon}
                    size={14}
                    strokeWidth={1.5}
                    className="shrink-0 text-muted-foreground/70"
                  />
                </div>
                <p className="mt-2 text-[28px] font-semibold tabular-nums leading-none text-foreground">
                  {count}
                </p>
                <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                  {stats.total === 0 ? "—" : `${percent}% of total`}
                </p>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", kpi.accent)}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </>
            )
            const className =
              "flex flex-col rounded-lg border border-border bg-card/60 p-4 transition-colors hover:bg-card"

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
        <h2 className="mb-3 text-[13px] font-medium text-foreground">
          Enrichment pipeline
        </h2>
        <div className="rounded-lg border border-border bg-card/40 p-4">
          <div className="flex h-3 overflow-hidden rounded-full">
            {pipeline.map((step, i) => {
              const hues = [220, 200, 170, 140, 110, 85]
              return (
                <div
                  key={step.id}
                  title={`${step.label}: ${step.count}`}
                  className="h-full min-w-[2px] transition-all"
                  style={{
                    flex: Math.max(step.count, 0.001),
                    backgroundColor: `hsl(${hues[i] ?? 200} 55% ${42 + i * 4}%)`,
                  }}
                />
              )
            })}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {pipeline.map((step) => {
              const href =
                step.id === "total"
                  ? "/leads"
                  : statFilterHref(step.id, visualKey)
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
              if (href) {
                return (
                  <Link
                    key={step.id}
                    href={href}
                    className="flex flex-col gap-0.5 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/50"
                  >
                    {content}
                  </Link>
                )
              }
              return (
                <div key={step.id} className="flex flex-col gap-0.5 px-2 py-1.5">
                  {content}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section
        aria-label="Score distributions"
        className="grid gap-4 lg:grid-cols-2"
      >
        <ScoreHistogram
          title="Your score (1–10)"
          subtitle={`${stats.userRated} rated leads`}
          buckets={stats.leadScoreBuckets}
          useHeat
        />
        <ScoreHistogram
          title="Visual rating"
          subtitle={`${stats.visualScore} with visual score`}
          buckets={stats.visualRatingBuckets}
        />
      </section>

      {fieldCoverage.length > 0 && (
        <section aria-label="Dynamic field coverage">
          <h2 className="mb-3 text-[13px] font-medium text-foreground">
            Dynamic fields
          </h2>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[11px] text-muted-foreground">
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
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="px-4 py-2.5">
                        {href ? (
                          <Link
                            href={href}
                            className="font-medium text-foreground hover:text-primary hover:underline"
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
                              className="h-full rounded-full bg-primary/70"
                              style={{
                                width: `${Math.round(row.percent * 100)}%`,
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
        </section>
      )}
    </div>
  )
}

function ScoreHistogram({
  title,
  subtitle,
  buckets,
  useHeat,
}: {
  title: string
  subtitle: string
  buckets: Record<ScoreBucket, number>
  useHeat?: boolean
}) {
  const max = Math.max(1, ...SCORE_BUCKETS.map((b) => buckets[b]))

  return (
    <div className="rounded-lg border border-border bg-card/40 p-4">
      <h3 className="text-[13px] font-medium text-foreground">{title}</h3>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
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
                    "w-full min-h-[2px] rounded-t-sm transition-all",
                    !useHeat && "bg-primary/60",
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
    <div className="flex flex-col gap-8 p-6">
      <div className="space-y-2">
        <div className="h-7 w-32 animate-pulse rounded bg-muted/50" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted/40" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[120px] animate-pulse rounded-lg border border-border bg-muted/20"
          />
        ))}
      </div>
      <div className="h-24 animate-pulse rounded-lg border border-border bg-muted/20" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-44 animate-pulse rounded-lg border border-border bg-muted/20" />
        <div className="h-44 animate-pulse rounded-lg border border-border bg-muted/20" />
      </div>
    </div>
  )
}
