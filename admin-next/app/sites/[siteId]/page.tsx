import Link from "next/link"
import { notFound } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"

import { getSupabaseAdmin } from "@/lib/supabase-server"
import type { CmsContentRow, SiteAdminRow, SiteRow } from "@/lib/sites-types"

async function loadSite(
  siteId: string,
): Promise<
  | { ok: true; site: SiteRow; admins: SiteAdminRow[]; cmsContent: CmsContentRow[] }
  | { ok: false; status: 404 | 500; message: string }
> {
  try {
    const supabase = getSupabaseAdmin()

    const { data: siteRow, error: siteErr } = await supabase
      .from("sites")
      .select("id, slug, name, created_at")
      .eq("id", siteId)
      .maybeSingle()

    if (siteErr) return { ok: false, status: 500, message: siteErr.message }
    if (!siteRow) return { ok: false, status: 404, message: "Site not found" }

    const site = siteRow as SiteRow

    const { data: adminRows, error: adminsErr } = await supabase
      .from("cms_admins")
      .select("user_id, created_at")
      .eq("site_id", siteId)
      .order("created_at", { ascending: false })

    if (adminsErr) return { ok: false, status: 500, message: adminsErr.message }

    const admins: SiteAdminRow[] = await Promise.all(
      (adminRows ?? []).map(async (row) => {
        const { data, error } = await supabase.auth.admin.getUserById(row.user_id)
        if (error || !data?.user) {
          return { user_id: row.user_id, email: null, created_at: row.created_at }
        }
        return { user_id: row.user_id, email: data.user.email ?? null, created_at: row.created_at }
      }),
    )

    const { data: contentRows, error: contentErr } = await supabase
      .from("cms_content")
      .select("key, kind, value, updated_at, updated_by")
      .eq("site_id", siteId)
      .order("key", { ascending: true })

    if (contentErr) return { ok: false, status: 500, message: contentErr.message }

    return { ok: true, site, admins, cmsContent: (contentRows ?? []) as CmsContentRow[] }
  } catch (e) {
    return { ok: false, status: 500, message: e instanceof Error ? e.message : String(e) }
  }
}

export default async function SiteDetailPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params
  const result = await loadSite(siteId)

  if (!result.ok && result.status === 404) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link
        href="/sites"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-[12px]"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={12} strokeWidth={1.75} />
        All sites
      </Link>

      {!result.ok ? (
        <div className="text-muted-foreground rounded-md border p-6 text-center text-[13px]">
          Couldn&apos;t load site. {result.message}
        </div>
      ) : (
        <>
          <header className="mb-6">
            <h1 className="text-[20px] font-semibold leading-tight">{result.site.name}</h1>
            <p className="text-muted-foreground mt-1 font-mono text-[12px]">
              /{result.site.slug} · {result.site.id}
            </p>
          </header>

          <section className="mb-8">
            <h2 className="text-muted-foreground mb-2 text-[11px] font-semibold uppercase tracking-wide">
              Admins
            </h2>
            {result.admins.length === 0 ? (
              <p className="text-muted-foreground text-[13px]">No admins assigned.</p>
            ) : (
              <ul className="divide-border divide-y rounded-md border">
                {result.admins.map((a) => (
                  <li key={a.user_id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="min-w-0">
                      <div className="text-foreground text-[13px]">{a.email ?? "(no email)"}</div>
                      <div className="text-muted-foreground mt-0.5 truncate font-mono text-[11px]">
                        {a.user_id}
                      </div>
                    </div>
                    <span className="text-muted-foreground text-[11px]">
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-muted-foreground mt-2 text-[11px]">
              Adding admins / generating one-time login links is still in the legacy
              <code className="font-mono"> /admin</code> app for now.
            </p>
          </section>

          <section>
            <h2 className="text-muted-foreground mb-2 text-[11px] font-semibold uppercase tracking-wide">
              CMS content
            </h2>
            {result.cmsContent.length === 0 ? (
              <p className="text-muted-foreground text-[13px]">No CMS content stored.</p>
            ) : (
              <p className="text-muted-foreground text-[13px]">
                {result.cmsContent.length} entr{result.cmsContent.length === 1 ? "y" : "ies"} —
                edit in the legacy <code className="font-mono">/admin</code> app for now.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
