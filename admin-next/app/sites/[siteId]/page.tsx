import { notFound } from "next/navigation"

import { SiteDetailView } from "@/components/sites/site-detail-view"
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
        return {
          user_id: row.user_id,
          email: data.user.email ?? null,
          created_at: row.created_at,
        }
      }),
    )

    const { data: contentRows, error: contentErr } = await supabase
      .from("cms_content")
      .select("key, kind, value, updated_at, updated_by")
      .eq("site_id", siteId)
      .order("key", { ascending: true })

    if (contentErr) return { ok: false, status: 500, message: contentErr.message }

    return {
      ok: true,
      site,
      admins,
      cmsContent: (contentRows ?? []) as CmsContentRow[],
    }
  } catch (e) {
    return {
      ok: false,
      status: 500,
      message: e instanceof Error ? e.message : String(e),
    }
  }
}

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = await params
  const result = await loadSite(siteId)

  if (!result.ok && result.status === 404) {
    notFound()
  }

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="text-muted-foreground rounded-md border p-6 text-center text-[13px]">
          Couldn&apos;t load site. {result.message}
        </div>
      </div>
    )
  }

  return (
    <SiteDetailView
      site={result.site}
      admins={result.admins}
      cmsContent={result.cmsContent}
    />
  )
}
