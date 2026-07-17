"use server"

import { randomBytes } from "node:crypto"
import { revalidatePath } from "next/cache"

import { authCallbackOrigin, getSupabaseAdmin } from "@/lib/supabase-server"

export type SiteActionResult =
  | { ok: true }
  | { ok: false; message: string }

export type LoginLinkResult =
  | { ok: true; loginLink: string }
  | { ok: false; message: string }

export async function addSiteAdmin(
  siteId: string,
  email: string,
): Promise<SiteActionResult> {
  const trimmedSiteId = siteId?.trim()
  if (!trimmedSiteId) {
    return { ok: false, message: "Missing site" }
  }

  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) {
    return { ok: false, message: "Email is required" }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { ok: false, message: "Invalid email address" }
  }

  const supabase = getSupabaseAdmin()

  let userId: string | null = null

  const created = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm: true,
  })

  if (created.data?.user?.id) {
    userId = created.data.user.id
  } else if (created.error) {
    const msg = (created.error.message || "").toLowerCase()
    const code = (created.error as unknown as { code?: string }).code
    const exists =
      code === "email_exists" ||
      msg.includes("already") ||
      msg.includes("exists") ||
      msg.includes("registered")
    if (!exists) {
      return { ok: false, message: created.error.message }
    }

    const perPage = 1000
    for (let page = 1; page <= 50 && !userId; page++) {
      const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      })
      if (listErr) {
        return { ok: false, message: listErr.message }
      }
      const found = listData.users.find(
        (u) => (u.email ?? "").toLowerCase() === normalizedEmail,
      )
      if (found) {
        userId = found.id
        break
      }
      if (listData.users.length < perPage) break
    }

    if (!userId) {
      return {
        ok: false,
        message: "Could not find an existing user with that email",
      }
    }
  } else {
    return { ok: false, message: "Failed to create user" }
  }

  const { error: upErr } = await supabase
    .from("cms_admins")
    .upsert(
      { site_id: trimmedSiteId, user_id: userId },
      { onConflict: "user_id,site_id", ignoreDuplicates: true },
    )

  if (upErr) {
    return { ok: false, message: upErr.message }
  }

  revalidatePath(`/sites/${trimmedSiteId}`)
  return { ok: true }
}

export async function createAdminLoginLink(
  siteId: string,
  userId: string,
): Promise<LoginLinkResult> {
  const trimmedSiteId = siteId?.trim()
  if (!trimmedSiteId) {
    return { ok: false, message: "Missing site" }
  }

  const trimmedUserId = userId?.trim()
  if (!trimmedUserId) {
    return { ok: false, message: "Missing user" }
  }

  const supabase = getSupabaseAdmin()

  const { data: adminRow, error: adminErr } = await supabase
    .from("cms_admins")
    .select("user_id")
    .eq("site_id", trimmedSiteId)
    .eq("user_id", trimmedUserId)
    .maybeSingle()

  if (adminErr) {
    return { ok: false, message: adminErr.message }
  }
  if (!adminRow) {
    return { ok: false, message: "User is not an admin for this site" }
  }

  const code = randomBytes(32).toString("base64url")
  const { error: upErr } = await supabase
    .from("cms_admins")
    .update({ code })
    .eq("site_id", trimmedSiteId)
    .eq("user_id", trimmedUserId)

  if (upErr) {
    return { ok: false, message: upErr.message }
  }

  const base = authCallbackOrigin().replace(/\/$/, "")
  return {
    ok: true,
    loginLink: `${base}/auth/callback?code=${encodeURIComponent(code)}&next=/`,
  }
}
