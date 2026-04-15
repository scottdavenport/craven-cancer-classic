import { createClient } from "./server";
import { redirect } from "next/navigation";
import type { Profile } from "@/types/database";

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  return data;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await getProfile();

  if (!profile || profile.role !== "admin") {
    redirect("/auth/login");
  }

  return profile;
}
