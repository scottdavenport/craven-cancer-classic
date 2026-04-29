"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";

export type ScoreWithTeam = {
  id: string;
  total_score: number;
  session: string | null;
  source: string;
  year: number;
  created_at: string;
  individual_scores: import("@/types/database").Json;
  team_id: string | null;
  captain_display_name: string;
};

export async function getScores(): Promise<ScoreWithTeam[]> {
  await requireAdmin();
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const { data, error } = await supabase
    .from("scores")
    .select(
      "*, team:teams(captain_contact_id, captain:contacts!teams_captain_contact_id_fkey(full_name))"
    )
    .eq("year", currentYear)
    .order("total_score", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const team = row.team as {
      captain_contact_id: string | null;
      captain: { full_name: string } | null;
    } | null;
    const captain_display_name = team?.captain?.full_name ?? "(no team)";
    return {
      id: row.id,
      total_score: row.total_score,
      session: row.session,
      source: row.source,
      year: row.year,
      created_at: row.created_at,
      individual_scores: row.individual_scores,
      team_id: row.team_id,
      captain_display_name,
    };
  });
}

export type TeamDropdownOption = {
  team_id: string;
  captain_display_name: string;
};

export async function getActiveTeamsForDropdown(): Promise<TeamDropdownOption[]> {
  await requireAdmin();
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const { data, error } = await supabase
    .from("teams_active")
    .select(
      "id, captain:contacts!teams_captain_contact_id_fkey(first_name, last_name, full_name)"
    )
    .eq("year", currentYear);

  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((row) => {
    const captain = row.captain as
      | { first_name: string; last_name: string; full_name: string }
      | null;
    return {
      team_id: row.id as string,
      captain_display_name: captain?.full_name ?? "(no captain)",
      _last_name: captain?.last_name ?? "",
    };
  });

  // Alphabetize by captain last name, then first name (locked decision in plan).
  rows.sort((a, b) => a._last_name.localeCompare(b._last_name) || a.captain_display_name.localeCompare(b.captain_display_name));

  return rows.map(({ team_id, captain_display_name }) => ({ team_id, captain_display_name }));
}

export async function addScore(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const teamIdRaw = formData.get("team_id") as string | null;

  const { error } = await supabase.from("scores").insert({
    team_id: teamIdRaw || null,
    session: (formData.get("session") as "morning" | "afternoon") || null,
    total_score: parseInt(formData.get("total_score") as string),
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

  const teamIdx = cols.findIndex((c) => c.includes("team"));
  const scoreIdx = cols.findIndex((c) => c.includes("score") || c.includes("total"));
  const sessionIdx = cols.findIndex((c) => c.includes("session"));

  if (teamIdx === -1 || scoreIdx === -1) {
    return { error: "CSV must have 'team' and 'score' columns" };
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
