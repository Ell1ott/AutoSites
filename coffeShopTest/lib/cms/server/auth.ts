import { createSessionServerClient } from "./supabase";

export class CmsAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CmsAuthError";
  }
}

/**
 * Verifies the request comes from an authenticated CMS admin. Throws
 * `CmsAuthError` otherwise. Intended for the top of Server Actions and
 * Route Handlers that perform writes — defence in depth on top of RLS.
 */
export async function requireAdmin(): Promise<{ userId: string }> {
  const supabase = await createSessionServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new CmsAuthError("Not signed in.");

  const { data: admin } = await supabase
    .from("cms_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin) throw new CmsAuthError("Not an admin.");
  return { userId: user.id };
}
