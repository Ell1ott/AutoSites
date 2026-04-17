import { createSessionServerClient } from "./supabase";
import { getSiteId } from "./site";

export class CmsAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CmsAuthError";
  }
}

export async function requireAdmin(): Promise<{ userId: string; siteId: string }> {
  const siteId = await getSiteId();
  const supabase = await createSessionServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new CmsAuthError("Not signed in.");

  const { data: admin } = await supabase
    .from("cms_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("site_id", siteId)
    .maybeSingle();

  if (!admin) throw new CmsAuthError("Not an admin for this site.");
  return { userId: user.id, siteId };
}
