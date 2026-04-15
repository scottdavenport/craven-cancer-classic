"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

export async function getEventSettings() {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const { data, error } = await supabase
    .from("event_settings")
    .select("*")
    .eq("year", currentYear)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }

  return data;
}

export async function updateEventSettings(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const updates: Database["public"]["Tables"]["event_settings"]["Update"] = {
    name: formData.get("name") as string,
    date: (formData.get("date") as string) || null,
    location: formData.get("location") as string,
    description: formData.get("description") as string,
    morning_cap: parseInt(formData.get("morning_cap") as string) || 36,
    afternoon_cap: parseInt(formData.get("afternoon_cap") as string) || 36,
    registration_open: formData.get("registration_open") === "on",
  };

  // Check if settings exist for this year
  const { data: existing } = await supabase
    .from("event_settings")
    .select("id")
    .eq("year", currentYear)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("event_settings")
      .update(updates)
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("event_settings")
      .insert({ ...updates, year: currentYear });

    if (error) return { error: error.message };
  }

  revalidatePath("/admin/event");
  revalidatePath("/");
  return { success: true };
}
