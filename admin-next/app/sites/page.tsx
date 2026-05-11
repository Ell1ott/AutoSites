import Link from "next/link"

import { getSupabaseAdmin } from "@/lib/supabase-server"
import type { SiteRow } from "@/lib/sites-types"

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

  return (
    <div className="flex h-full flex-col">
      <header className="border-border flex shrink-0 items-center justify-between border-b px-5 py-3">
        <div>
          <h1 className="text-[15px] font-medium leading-none">Sites</h1>
          <p className="text-muted-foreground mt-1 text-[12px]">
            {error ? "Supabase unreachable" : `${sites.length} site${sites.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </header>

      {error ? (
        <div className="text-muted-foreground p-6 text-center text-[13px]">
          Couldn&apos;t load sites. {error}
          <br />
          Check <code className="font-mono">SUPABASE_URL</code> +{" "}
          <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code>.
        </div>
      ) : sites.length === 0 ? (
        <p className="text-muted-foreground p-6 text-center text-[13px]">No sites yet.</p>
      ) : (
        <ul className="divide-border divide-y">
          {sites.map((s) => (
            <li key={s.id}>
              <Link
                href={`/sites/${s.id}`}
                className="hover:bg-accent/40 flex items-center gap-3 px-5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-foreground text-[13px] font-medium">{s.name}</div>
                  <div className="text-muted-foreground mt-0.5 truncate font-mono text-[11px]">
                    /{s.slug}
                  </div>
                </div>
                <span className="text-muted-foreground text-[11px]">
                  {new Date(s.created_at).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
