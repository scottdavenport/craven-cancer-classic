"use server";

import { createClient } from "@/lib/supabase/server";

export interface DashboardStats {
  registrations: number;
  sponsors: number;
  revenue_cents: number;
  pending_photos: number;
  contacts: number;
  scores: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const [teamsRes, sponsorsRes, revenueRes, photosRes, contactsRes, scoresRes] =
    await Promise.all([
      supabase
        .from("teams_active")
        .select("*", { count: "exact", head: true })
        .eq("year", currentYear),
      supabase
        .from("sponsors_active")
        .select("*", { count: "exact", head: true }),
      supabase.from("sponsors_active").select("amount_paid_cents"),
      supabase
        .from("photos")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("contacts_active")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("scores")
        .select("*", { count: "exact", head: true })
        .eq("year", currentYear),
    ]);

  if (teamsRes.error) throw new Error(teamsRes.error.message);
  if (sponsorsRes.error) throw new Error(sponsorsRes.error.message);
  if (revenueRes.error) throw new Error(revenueRes.error.message);
  if (photosRes.error) throw new Error(photosRes.error.message);
  if (contactsRes.error) throw new Error(contactsRes.error.message);
  if (scoresRes.error) throw new Error(scoresRes.error.message);

  const revenue_cents = (revenueRes.data ?? []).reduce(
    (sum, row) => sum + (row.amount_paid_cents ?? 0),
    0
  );

  return {
    registrations: teamsRes.count ?? 0,
    sponsors: sponsorsRes.count ?? 0,
    revenue_cents,
    pending_photos: photosRes.count ?? 0,
    contacts: contactsRes.count ?? 0,
    scores: scoresRes.count ?? 0,
  };
}
