"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import type { Contact, Team, Sponsor, SponsorshipItem, Photo } from "@/types/database";

// ---- Get functions ----

export async function getTrashContacts(): Promise<Contact[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Contact[];
}

export async function getTrashTeams(): Promise<Team[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Team[];
}

export async function getTrashSponsors(): Promise<Sponsor[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sponsors")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Sponsor[];
}

export async function getTrashSponsorshipItems(): Promise<SponsorshipItem[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sponsorship_items")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SponsorshipItem[];
}

export async function getTrashPhotos(): Promise<Photo[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Photo[];
}

// ---- Restore functions ----

export async function restoreContact(
  id: string
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("contacts")
    .update({ deleted_at: null, deleted_by: null })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return {
        error:
          "A record with the same unique field already exists. Resolve the conflict before restoring.",
      };
    }
    return { error: error.message };
  }
  return { ok: true };
}

export async function restoreTeam(
  id: string
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ deleted_at: null, deleted_by: null })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return {
        error:
          "A record with the same unique field already exists. Resolve the conflict before restoring.",
      };
    }
    return { error: error.message };
  }
  return { ok: true };
}

export async function restoreSponsor(
  id: string
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("sponsors")
    .update({ deleted_at: null, deleted_by: null })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return {
        error:
          "A record with the same unique field already exists. Resolve the conflict before restoring.",
      };
    }
    return { error: error.message };
  }
  return { ok: true };
}

export async function restoreSponsorshipItem(
  id: string
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("sponsorship_items")
    .update({ deleted_at: null, deleted_by: null })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return {
        error:
          "A record with the same unique field already exists. Resolve the conflict before restoring.",
      };
    }
    return { error: error.message };
  }
  return { ok: true };
}

export async function restorePhoto(
  id: string
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("photos")
    .update({ deleted_at: null, deleted_by: null })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return {
        error:
          "A record with the same unique field already exists. Resolve the conflict before restoring.",
      };
    }
    return { error: error.message };
  }
  return { ok: true };
}
