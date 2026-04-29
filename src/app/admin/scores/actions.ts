"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";

export type ActiveTeamForDropdown = {
  id: string;
  captain_full_name: string;
};

export async function getActiveTeamsForDropdown(): Promise<ActiveTeamForDropdown[]> {
  await requireAdmin();
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const { data, error } = await supabase
    .from("teams_active")
    .select("id, captain_contact_id, contacts!teams_captain_contact_id_fkey(full_name)")
    .eq("year", currentYear);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => {
      const contacts = row.contacts as { full_name: string } | null;
      const fullName = contacts?.full_name ?? "";
      // Build "Last, First" for alphabetization; store original for display
      const parts = fullName.trim().split(/\s+/);
      const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0] ?? "";
      const firstName = parts.length > 1 ? parts.slice(0, -1).join(" ") : "";
      const sortKey = firstName ? `${lastName}, ${firstName}` : lastName;
      return { id: row.id as string, captain_full_name: sortKey };
    })
    .sort((a, b) => a.captain_full_name.localeCompare(b.captain_full_name));
}

export async function getScores() {
  await requireAdmin();
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("year", currentYear)
    .order("total_score", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function addScore(values: {
  team_id: string | null;
  total_score: number;
  session: "morning" | "afternoon" | null;
}) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("scores").insert({
    team_id: values.team_id || null,
    session: values.session,
    total_score: values.total_score,
    source: "manual" as const,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/scores");
  revalidatePath("/leaderboard");
  return { success: true };
}

export async function importScoresFromCSV(csvText: string) {
  await requireAdmin();
  const supabase = await createClient();

  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return { error: "CSV must have a header and at least one row" };

  const header = lines[0].toLowerCase();
  const cols = header.split(",").map((c) => c.trim());

  const scoreIdx = cols.findIndex((c) => c.includes("score") || c.includes("total"));
  const sessionIdx = cols.findIndex((c) => c.includes("session"));

  if (scoreIdx === -1) {
    return { error: "CSV must have a 'score' column" };
  }

  const rows = lines.slice(1).filter((l) => l.trim());
  const scores = rows.map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const sessionVal = sessionIdx >= 0 ? values[sessionIdx]?.toLowerCase() : null;

    return {
      total_score: parseInt(values[scoreIdx]) || 0,
      session:
        sessionVal === "morning" || sessionVal === "afternoon"
          ? (sessionVal as "morning" | "afternoon")
          : null,
      source: "csv" as const,
    };
  });

  const { error } = await supabase.from("scores").insert(scores);
  if (error) return { error: error.message };

  revalidatePath("/admin/scores");
  revalidatePath("/leaderboard");
  return { success: true, count: scores.length };
}

export async function updateScore(
  id: string,
  data: { team_id: string | null; total_score: number; session: "morning" | "afternoon" | null }
) {
  await requireAdmin();
  if (!Number.isFinite(data.total_score) || data.total_score < 0 || data.total_score > 200) {
    return { error: "Invalid total score" };
  }
  const supabase = await createClient();

  const { error } = await supabase
    .from("scores")
    .update({
      team_id: data.team_id,
      total_score: data.total_score,
      session: data.session,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/scores");
  revalidatePath("/leaderboard");
  return { success: true };
}

export async function deleteScore(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("scores").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/scores");
  revalidatePath("/leaderboard");
  return { success: true };
}

export async function deleteAllScores() {
  await requireAdmin();
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const { error } = await supabase
    .from("scores")
    .delete()
    .eq("year", currentYear);

  if (error) return { error: error.message };

  revalidatePath("/admin/scores");
  revalidatePath("/leaderboard");
  return { success: true };
}
