"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

type AuthResult = { error: string } | { success: string } | void;

// Derive the callback URL from the current request, not a build-time env var.
// Eliminates env-sync drift between local/preview/production.
async function getCallbackUrl(): Promise<string> {
  const h = await headers();
  const origin =
    h.get("origin") ??
    (h.get("x-forwarded-proto") && h.get("host")
      ? `${h.get("x-forwarded-proto")}://${h.get("host")}`
      : null) ??
    process.env.NEXT_PUBLIC_SITE_URL;
  return `${origin}/auth/callback`;
}

export async function signInWithPassword(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/admin");
}

export async function signInWithMagicLink(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email: formData.get("email") as string,
    options: {
      emailRedirectTo: await getCallbackUrl(),
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: "Check your email for the login link!" };
}

export async function signInWithGoogle(): Promise<AuthResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: await getCallbackUrl(),
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
