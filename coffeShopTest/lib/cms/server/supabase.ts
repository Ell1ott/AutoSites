import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient as createSsrClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

/**
 * Cookieless Supabase client, safe to call inside a `'use cache'` boundary.
 * Uses the anon key and is subject to RLS — so it can only read rows whose
 * `for select` policy permits anonymous access (true for `cms_content`).
 */
export function createPublicServerClient(): SupabaseClient {
  return createClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Session-aware Supabase client for Server Components, Server Actions,
 * and Route Handlers. Reads the current user's session from cookies so
 * RLS policies that check `auth.uid()` apply correctly.
 *
 * MUST NOT be called inside a `'use cache'` scope — it reads cookies.
 */
export async function createSessionServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createSsrClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(entries) {
          try {
            for (const { name, value, options } of entries) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // `cookies().set` throws in pure Server Components — tokens will
            // be refreshed on the next request that goes through middleware
            // or a server action. Safe to ignore here.
          }
        },
      },
    },
  );
}
