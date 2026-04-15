"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";

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

export async function addScore(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("scores").insert({
    team_name: formData.get("team_name") as string,
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
      team_name: values[teamIdx] || "Unknown",
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
