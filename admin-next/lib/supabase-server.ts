import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | undefined

export function getSupabaseAdmin(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error(
        "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
      )
    }
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}

export function authCallbackOrigin(): string {
  const raw =
    process.env.CMS_AUTH_CALLBACK_ORIGIN?.trim() ||
    process.env.AUTH_SITE_URL?.trim() ||
    process.env.CMS_LOGIN_REDIRECT_URL?.trim() ||
    "http://localhost:3000"
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`).origin
  } catch {
    return "http://localhost:3000"
  }
}
