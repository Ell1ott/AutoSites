import { NextResponse, type NextRequest } from "next/server";
import { createSessionServerClient } from "@/lib/cms/server/supabase";
import { getSiteId } from "@/lib/cms/server/site";

const EDIT_COOKIE = "cms-edit";

/**
 * Enter edit mode: sets `cms-edit` for admins, or sends unauthenticated users
 * to sign in.
 */
export async function GET(request: NextRequest) {
  const supabase = await createSessionServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/cms/login", request.url));
  }

  const siteId = await getSiteId();
  const { data: admin } = await supabase
    .from("cms_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("site_id", siteId)
    .maybeSingle();

  if (!admin) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const res = NextResponse.redirect(new URL("/", request.url));
  res.cookies.set(EDIT_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
