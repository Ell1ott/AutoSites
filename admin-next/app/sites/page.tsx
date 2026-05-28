import Link from "next/link"

import { Globe02Icon, Alert02Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shell/empty-state"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import type { SiteRow } from "@/lib/sites-types"

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--info)",
]

function hashIdx(s: string, mod: number) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h % mod
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

async function loadSites(): Promise<{ sites: SiteRow[]; error?: string }> {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("sites")
      .select("id, slug, name, created_at")
      .order("created_at", { ascending: false })
    if (error) return { sites: [], error: error.message }
    return { sites: (data ?? []) as SiteRow[] }
  } catch (e) {
    return { sites: [], error: e instanceof Error ? e.message : String(e) }
  }
}

export default async function SitesPage() {
  const { sites, error } = await loadSites()
  const now = Date.now()

  return (
    <div className="flex h-full flex-col">
      <header className="border-border flex shrink-0 items-center justify-between border-b px-5 py-3">
        <div>
          <h1 className="text-[15px] font-semibold leading-none">Sites</h1>
          <p className="text-muted-foreground mt-1 text-[12px]">
            {error
              ? "Supabase unreachable"
              : `${sites.length} site${sites.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button size="sm">+ New site</Button>
      </header>

      {error ? (
        <EmptyState
          icon={Alert02Icon}
          title="Couldn't load sites"
          description={
            <>
              {error}. Check{" "}
              <code className="font-mono">SUPABASE_URL</code> +{" "}
              <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code>.
            </>
          }
        />
      ) : sites.length === 0 ? (
        <EmptyState
          icon={Globe02Icon}
          title="No sites yet"
          description="Sites you create will show up here."
          action={
            <Button size="sm">
              <span className="inline-flex items-center gap-1">+ New site</span>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-5">
          {sites.map((s) => {
            const slug = s.slug ?? ""
            const name = s.name ?? slug
            const color = PALETTE[hashIdx(slug || s.id, PALETTE.length)]
            const initial = (name || slug || "?").trim().charAt(0).toUpperCase()
            const createdMs = new Date(s.created_at).getTime()
            const isNew =
              Number.isFinite(createdMs) && now - createdMs < SEVEN_DAYS_MS
            const gradId = `g-${s.id}`
            return (
              <Link
                key={s.id}
                href={`/sites/${s.id}`}
                className="group relative rounded-xl border bg-card overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-pop)] transition-all duration-200 hover:-translate-y-0.5"
              >
                {isNew && (
                  <span
                    className="absolute top-2.5 right-2.5 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                    style={{
                      background:
                        "color-mix(in oklch, var(--info) 15%, transparent)",
                      color: "var(--info)",
                    }}
                  >
                    New
                  </span>
                )}
                <svg
                  viewBox="0 0 160 90"
                  className="w-full block"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(0,0,0,0)" />
                      <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
                    </linearGradient>
                  </defs>
                  <rect width="160" height="90" fill={color} />
                  <rect width="160" height="90" fill={`url(#${gradId})`} />
                  <text
                    x="80"
                    y="45"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="36"
                    fontWeight="600"
                    fill="#ffffff"
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    {initial}
                  </text>
                </svg>
                <div className="p-3.5">
                  <div className="text-foreground text-[14px] font-semibold truncate">
                    {name}
                  </div>
                  <div className="text-muted-foreground font-mono text-[11px] truncate">
                    /{slug}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span
                      style={{ background: "var(--success)" }}
                      className="inline-block h-1.5 w-1.5 rounded-full"
                    />
                    <span>Live</span>
                    <span>·</span>
                    <span className="truncate">
                      Created {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
