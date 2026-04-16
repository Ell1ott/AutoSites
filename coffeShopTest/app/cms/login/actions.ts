"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionServerClient } from "@/lib/cms/server/supabase";

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
    return { error: error?.message ?? "Sign-in failed." };
  }

  const { data: admin } = await supabase
    .from("cms_admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!admin) {
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

  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createSessionServerClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(EDIT_COOKIE);
  redirect("/");
}
