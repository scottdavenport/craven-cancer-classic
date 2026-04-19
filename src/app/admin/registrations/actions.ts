"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";

export async function getTeams() {
  await requireAdmin();
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("year", currentYear)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}
