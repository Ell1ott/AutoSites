"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionServerClient } from "@/lib/cms/server/supabase";
import { getCmsLogger } from "@/lib/cms/logger";

const EDIT_COOKIE = "cms-edit";

export async function signIn(
  _prevState: { error: string } | undefined,
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  const supabase = await createSessionServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    await getCmsLogger().captureServerEvent("admin_sign_in_failed", {
      email_attempted: email,
      reason: error?.message ?? "no_user",
    });
    return { error: error?.message ?? "Sign-in failed." };
  }

  const { data: admin } = await supabase
    .from("cms_admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!admin) {
    await getCmsLogger().captureServerEvent("admin_sign_in_failed", {
      email_attempted: email,
      reason: "not_admin",
    }, { userId: data.user.id, email: data.user.email ?? null });
    await supabase.auth.signOut();
    return { error: "This account is not authorised to edit." };
  }

  const cookieStore = await cookies();
  cookieStore.set(EDIT_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  await getCmsLogger().captureServerEvent(
    "admin_signed_in",
    {},
    { userId: data.user.id, email: data.user.email ?? null },
  );

  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createSessionServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  await getCmsLogger().captureServerEvent(
    "admin_signed_out",
    {},
    { userId: user?.id ?? null, email: user?.email ?? null },
  );

  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(EDIT_COOKIE);
  redirect("/");
}
