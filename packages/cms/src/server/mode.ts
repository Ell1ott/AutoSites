import { cache } from "react";
import { cookies } from "next/headers";
import { createSessionServerClient } from "./supabase";
import { getSiteId } from "./site";

export const getEditMode = cache(async (): Promise<boolean> => {
  const cookieStore = await cookies();
  if (cookieStore.get("cms-edit")?.value !== "1") return false;

  const siteId = await getSiteId();
  const supabase = await createSessionServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: admin } = await supabase
    .from("cms_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("site_id", siteId)
    .maybeSingle();

  return Boolean(admin);
});
