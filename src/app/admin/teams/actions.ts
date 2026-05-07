"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { softDelete } from "@/lib/supabase/soft-delete";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TeamMemberRow = {
  contact_id: string;
  full_name: string;
  role: "captain" | "player";
  slot: number;
};

export type TeamWithMembers = {
  id: string;
  captain_display_name: string;
  year: number;
  captain_contact_id: string | null;
  payment_status: string;
  amount_paid_cents: number;
  payment_method: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  session: string;
  members: TeamMemberRow[];
  member_count: number;
  open_slots: number;
};

export type ContactSearchResult = {
  id: string;
  full_name: string;
  email: string | null;
  company: string | null;
};

// ---------------------------------------------------------------------------
// getTeams
// ---------------------------------------------------------------------------

export async function getTeams(year?: number): Promise<TeamWithMembers[]> {
  const supabase = await createClient();

  // Admin or viewer may call this
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile) throw new Error("Unauthorized");
  if (profile.role !== "admin" && profile.role !== "viewer") {
    throw new Error("Unauthorized");
  }

  const currentYear = new Date().getFullYear();
  const targetYear = year ?? currentYear;

  const { data, error } = await supabase
    .from("teams_active")
    .select(
      "*, payment_method, payment_reference, paid_at, captain:contacts!teams_captain_contact_id_fkey(full_name), team_members(contact_id, role, slot, contacts(id, full_name))"
    )
    .eq("year", targetYear)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((team) => {
    const rawMembers = (team.team_members ?? []) as Array<{
      contact_id: string;
      role: string;
      slot: number;
      contacts: { id: string; full_name: string } | null;
    }>;

    const members: TeamMemberRow[] = rawMembers.map((m) => ({
      contact_id: m.contact_id,
      full_name: m.contacts?.full_name ?? "",
      role: m.role as "captain" | "player",
      slot: m.slot,
    }));

    const member_count = members.length;
    const captain = team.captain as { full_name: string } | null;
    const captain_display_name = captain?.full_name ?? "(no captain)";

    // teams_active view inherits NOT NULL from underlying teams table;
    // Supabase types views as fully-nullable, so assert here.
    return {
      id: team.id!,
      captain_display_name,
      year: team.year!,
      captain_contact_id: team.captain_contact_id ?? null,
      payment_status: team.payment_status!,
      amount_paid_cents: team.amount_paid_cents!,
      payment_method: team.payment_method ?? null,
      payment_reference: team.payment_reference ?? null,
      paid_at: team.paid_at ?? null,
      session: team.session!,
      members,
      member_count,
      open_slots: 4 - member_count,
    };
  });
}

// ---------------------------------------------------------------------------
// searchContacts
// ---------------------------------------------------------------------------

export async function searchContacts(query: string): Promise<ContactSearchResult[]> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contacts")
    .select("id, full_name, email, company")
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(20);

  if (error) throw new Error(error.message);
  return (data ?? []) as ContactSearchResult[];
}

// ---------------------------------------------------------------------------
// createTeam
// ---------------------------------------------------------------------------

export type CreateTeamParams = {
  session: string;
  captain_contact_id: string;
  player_contact_ids: string[];
};

export async function createTeam(
  params: CreateTeamParams
): Promise<{ team_id: string } | { error: string }> {
  await requireAdmin();

  if (params.player_contact_ids.length > 3) {
    return { error: "Too many players: maximum 3 players (plus 1 captain = 4 per team)" };
  }

  const supabase = await createClient();

  // Call register_team RPC — captain params are vestigial back-compat (not used in body).
  // The admin-built flow links via captain_contact_id + team_members instead.
  const { data: rpcData, error: rpcError } = await supabase.rpc("register_team", {
    p_session: params.session,
    p_captain_name: "",
    p_captain_email: "",
    p_captain_phone: undefined,
  });

  if (rpcError) return { error: rpcError.message };

  const team_id = (rpcData as { team_id: string }).team_id;

  // Build team_members rows: slot 1 = captain, slots 2-4 = players
  const memberRows = [
    { team_id, contact_id: params.captain_contact_id, role: "captain", slot: 1 },
    ...params.player_contact_ids.map((contact_id, i) => ({
      team_id,
      contact_id,
      role: "player",
      slot: i + 2,
    })),
  ];

  const { error: insertError } = await supabase.from("team_members").insert(memberRows);
  if (insertError) return { error: insertError.message };

  // Update captain_contact_id on the team
  const { error: updateError } = await supabase
    .from("teams")
    .update({ captain_contact_id: params.captain_contact_id })
    .eq("id", team_id);

  if (updateError) return { error: updateError.message };

  return { team_id };
}

// ---------------------------------------------------------------------------
// updateTeamMembers
// ---------------------------------------------------------------------------

export type MemberInput = {
  contact_id: string;
  role: "captain" | "player";
  slot: number;
};

export async function updateTeamMembers(
  team_id: string,
  members: MemberInput[]
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();

  // Delete existing roster
  const { error: deleteError } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", team_id);

  if (deleteError) return { error: deleteError.message };

  // Insert new roster
  const rows = members.map((m) => ({ team_id, ...m }));
  const { error: insertError } = await supabase.from("team_members").insert(rows);
  if (insertError) return { error: insertError.message };

  // Update captain_contact_id if captain changed
  const captain = members.find((m) => m.role === "captain");
  if (captain) {
    const { error: updateError } = await supabase
      .from("teams")
      .update({ captain_contact_id: captain.contact_id })
      .eq("id", team_id);

    if (updateError) return { error: updateError.message };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// deleteTeam
// ---------------------------------------------------------------------------

export async function deleteTeam(
  team_id: string
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();
  return softDelete(supabase, "teams", team_id);
}

// ---------------------------------------------------------------------------
// getScoreCount
// ---------------------------------------------------------------------------

export async function getScoreCount(team_id: string): Promise<number> {
  await requireAdmin();
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("scores")
    .select("id", { count: "exact", head: true })
    .eq("team_id", team_id);

  if (error) return 0;
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// markTeamPaid
// ---------------------------------------------------------------------------

export type MarkTeamPaidParams = {
  amount_cents: number;
  payment_method: string;
  payment_reference?: string | null;
  paid_at?: string | null;
};

export async function markTeamPaid(
  team_id: string,
  params: MarkTeamPaidParams
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("teams")
    .update({
      payment_status: "paid",
      amount_paid_cents: params.amount_cents,
      payment_method: params.payment_method,
      payment_reference: params.payment_reference ?? null,
      paid_at: params.paid_at ?? new Date().toISOString(),
    })
    .eq("id", team_id);

  if (error) return { error: error.message };
  return { ok: true };
}
