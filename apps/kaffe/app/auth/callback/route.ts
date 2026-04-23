import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSessionServerClient } from "@/lib/cms/server/supabase";
import { getCmsLogger } from "@/lib/cms/logger";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    await getCmsLogger().captureServerEvent("auth_callback_failed", { reason: "missing_code" });
    return NextResponse.redirect(new URL("/cms/login?error=missing_code", origin));
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: row, error: lookupError } = await admin
    .from("cms_admins")
    .select("user_id")
    .eq("code", code)
    .maybeSingle();

  if (lookupError || !row) {
    await getCmsLogger().captureServerEvent("auth_callback_failed", { reason: "invalid_code" });
    return NextResponse.redirect(new URL("/cms/login?error=invalid_code", origin));
  }

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(row.user_id);
  if (userError || !userData.user?.email) {
    await getCmsLogger().captureServerEvent("auth_callback_failed", { reason: "user_not_found" }, {
      userId: row.user_id,
    });
    return NextResponse.redirect(new URL("/cms/login?error=user_not_found", origin));
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: userData.user.email,
  });
  if (linkError || !linkData.properties?.hashed_token) {
    await getCmsLogger().captureServerEvent("auth_callback_failed", { reason: "link_failed" }, {
      userId: userData.user.id,
      email: userData.user.email,
    });
    return NextResponse.redirect(new URL("/cms/login?error=link_failed", origin));
  }

  const session = await createSessionServerClient();
  const { error: verifyError } = await session.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });
  if (verifyError) {
    await getCmsLogger().captureServerEvent("auth_callback_failed", { reason: verifyError.message }, {
      userId: userData.user.id,
      email: userData.user.email,
    });
    return NextResponse.redirect(
      new URL(`/cms/login?error=${encodeURIComponent(verifyError.message)}`, origin),
    );
  }

  await getCmsLogger().captureServerEvent("auth_callback_succeeded", {}, {
    userId: userData.user.id,
    email: userData.user.email,
  });

  return NextResponse.redirect(new URL(next, origin));
}
