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
  try {
    await requireAdmin();
  } catch (_err) {
    return { error: "Unauthorized" };
  }

  const name = (formData.get("name") as string ?? "").trim();
  if (!name) return { error: "Tournament name is required" };
  if (name.length > 100) return { error: "Name must be 100 characters or fewer" };

  const description = (formData.get("description") as string ?? "").trim();
  if (description.length > 2000) return { error: "Description must be 2000 characters or fewer" };

  const feeRaw = formData.get("registration_fee") as string;
  const feeDollars = parseFloat(feeRaw);
  if (isNaN(feeDollars) || feeDollars < 0) return { error: "Invalid registration fee" };

  const morningCapRaw = formData.get("morning_cap") as string;
  const morningCap = parseInt(morningCapRaw, 10);
  if (isNaN(morningCap) || morningCap <= 0) return { error: "Morning cap must be positive" };

  const afternoonCapRaw = formData.get("afternoon_cap") as string;
  const afternoonCap = parseInt(afternoonCapRaw, 10);
  if (isNaN(afternoonCap) || afternoonCap <= 0) return { error: "Afternoon cap must be positive" };

  const startStr = (formData.get("tournament_start_date") as string) || null;
  const endStr = (formData.get("tournament_end_date") as string) || null;
  if (startStr && endStr && endStr < startStr) {
    return { error: "End date must be on or after start date" };
  }

  const lifetimeRaisedRaw = formData.get("lifetime_raised_cents") as string;
  const lifetimeRaisedDollars = lifetimeRaisedRaw ? parseFloat(lifetimeRaisedRaw) : null;
  if (lifetimeRaisedDollars !== null && (isNaN(lifetimeRaisedDollars) || lifetimeRaisedDollars < 0)) {
    return { error: "Invalid lifetime raised amount" };
  }

  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const updates: Database["public"]["Tables"]["event_settings"]["Update"] = {
    name,
    description,
    morning_cap: morningCap,
    afternoon_cap: afternoonCap,
    registration_open: formData.get("registration_open") === "on",
    registration_fee_cents: Math.round(feeDollars * 100),
    tournament_start_date: startStr,
    tournament_end_date: endStr,
    venue_name: (formData.get("venue_name") as string) || null,
    lifetime_raised_cents: lifetimeRaisedDollars !== null
      ? Math.round(lifetimeRaisedDollars * 100)
      : null,
  };

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
