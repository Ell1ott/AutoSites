import { cookies } from "next/headers";
import { createSessionServerClient } from "./supabase";

/**
 * Resolves whether the current request should render editable UI.
 *
 * Returns true only when ALL of:
 * 1. A Supabase session cookie is present and valid.
 * 2. The authenticated user is listed in `cms_admins`.
 * 3. The `cms-edit=1` cookie is set (toggled by middleware on `?edit=1`).
 *
 * Any anonymous or non-admin visitor silently gets view mode — even if
 * they manually set `?edit=1`. This is what keeps the editor code from
 * being shipped to non-admins: the render branch never fires for them.
 */
export async function getEditMode(): Promise<boolean> {
  const cookieStore = await cookies();
  if (cookieStore.get("cms-edit")?.value !== "1") return false;

  const supabase = await createSessionServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: admin } = await supabase
    .from("cms_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return Boolean(admin);
}
