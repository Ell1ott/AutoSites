import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const EDIT_COOKIE = "cms-edit";

/**
 * Two responsibilities:
 *
 * 1. Handle `?edit=1` / `?edit=0` — toggle the `cms-edit` cookie, then redirect
 *    to the same URL without the query param so it doesn't persist in
 *    bookmarks or analytics.
 * 2. Refresh the Supabase auth session so token rotation works across
 *    Server Components and Server Actions. Per Supabase docs, this must
 *    happen at the proxy layer.
 */
export async function proxy(request: NextRequest) {
  const editParam = request.nextUrl.searchParams.get("edit");

  if (editParam === "1" || editParam === "0") {
    const url = new URL(request.nextUrl);
    url.searchParams.delete("edit");
    const response = NextResponse.redirect(url);
    if (editParam === "1") {
      response.cookies.set(EDIT_COOKIE, "1", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    } else {
      response.cookies.delete(EDIT_COOKIE);
    }
    return response;
  }

  // Session refresh — mirror cookies between the incoming request and the
  // outgoing response so @supabase/ssr can rotate tokens transparently.
  const response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(entries) {
          for (const { name, value, options } of entries) {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );
  // Triggers refresh + setAll if the access token is stale.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals and static asset extensions.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?)).*)",
  ],
};
