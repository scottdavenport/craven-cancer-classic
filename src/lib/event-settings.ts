import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type EventSettings =
  Database["public"]["Tables"]["event_settings"]["Row"];

/**
 * Public-safe server helper — reads event_settings for the current year.
 * tournament_start_date, tournament_end_date, and venue_name are public info.
 * Returns null when no row exists for this year (graceful fallback).
 */
export async function getPublicEventSettings(): Promise<EventSettings | null> {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const { data, error } = await supabase
    .from("event_settings")
    .select("*")
    .eq("year", currentYear)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows — not an error for our purposes
    console.error("[event-settings] Failed to load event settings:", error);
    return null;
  }

  return data ?? null;
}

export function formatTournamentDate(
  start: string | null,
  end: string | null
): string {
  if (!start) return "Date TBD";
  const startDate = new Date(start);
  if (isNaN(startDate.getTime())) return "Date TBD";

  const endDate = end ? new Date(end) : null;
  if (endDate && isNaN(endDate.getTime())) {
    // bad end date — treat as single-day
    return startDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  if (!endDate || startDate.toDateString() === endDate.toDateString()) {
    return startDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  // Same month: "September 18–19, 2026"
  if (startDate.getMonth() === endDate.getMonth()) {
    return `${startDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })}–${endDate.getDate()}, ${startDate.getFullYear()}`;
  }

  // Cross-month: "August 31 – September 1, 2026"
  return `${startDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${endDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
}
