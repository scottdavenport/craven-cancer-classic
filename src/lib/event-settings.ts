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
      timeZone: "UTC",
    });
  }

  // Compare dates using UTC values so local timezone offset never shifts the day
  const sameDay =
    !endDate ||
    (startDate.getUTCFullYear() === endDate.getUTCFullYear() &&
      startDate.getUTCMonth() === endDate.getUTCMonth() &&
      startDate.getUTCDate() === endDate.getUTCDate());

  if (sameDay) {
    return startDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  // Same month: "September 18–19, 2026"
  if (startDate.getUTCMonth() === endDate.getUTCMonth() && startDate.getUTCFullYear() === endDate.getUTCFullYear()) {
    return `${startDate.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}–${endDate.getUTCDate()}, ${startDate.getUTCFullYear()}`;
  }

  // Cross-month: "August 31 – September 1, 2026"
  return `${startDate.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })} – ${endDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}`;
}
