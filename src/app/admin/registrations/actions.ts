"use server";

import { revalidatePath } from "next/cache";
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

export async function getPlayersForTeam(teamId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", teamId);

  if (error) throw new Error(error.message);
  return data;
}

export async function createTeamManually(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      team_name: formData.get("team_name") as string,
      captain_name: formData.get("captain_name") as string,
      captain_email: formData.get("captain_email") as string,
      captain_phone: (formData.get("captain_phone") as string) || null,
      session: formData.get("session") as "morning" | "afternoon",
      payment_status: (formData.get("payment_status") as "pending" | "paid" | "comped") || "pending",
      amount_paid_cents: Math.round((parseFloat(formData.get("amount_paid") as string) || 0) * 100),
      notes: (formData.get("notes") as string) || null,
    })
    .select()
    .single();

  if (teamError || !team) return { error: teamError?.message || "Failed" };

  // Add players
  for (let i = 0; i < 4; i++) {
    const name = formData.get(`player_${i}_name`) as string;
    if (name) {
      await supabase.from("players").insert({
        team_id: team.id,
        full_name: name,
        email: (formData.get(`player_${i}_email`) as string) || null,
        phone: (formData.get(`player_${i}_phone`) as string) || null,
        handicap: parseInt(formData.get(`player_${i}_handicap`) as string) || null,
      });
    }
  }

  revalidatePath("/admin/registrations");
  return { success: true };
}

export async function deleteTeam(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/registrations");
  return { success: true };
}
