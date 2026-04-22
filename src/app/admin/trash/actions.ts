"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import type { Contact, Team, Sponsor, SponsorshipItem, Photo } from "@/types/database";

// ---- Types ----

export type WithDeletedByName<T> = T & { deleted_by_name: string | null };

// ---- Helpers ----

/**
 * Given a list of rows with a deleted_by UUID field, queries profiles
 * by auth_user_id to resolve each UUID to a full_name.
 * Returns a UUID→name map for all resolved profiles.
 *
 * Note: deleted_by references auth.users(id), not profiles.id directly.
 * PostgREST embedded joins can't traverse this indirect FK, so we do a
 * separate profiles query and merge manually.
 */
async function resolveDeletedByNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: Array<{ deleted_by: string | null }>
): Promise<Map<string, string>> {
  const uuids = [...new Set(rows.map((r) => r.deleted_by).filter(Boolean))] as string[];
  if (uuids.length === 0) return new Map();

  const { data } = await supabase
    .from("profiles")
    .select("auth_user_id, full_name")
    .in("auth_user_id", uuids);

  const map = new Map<string, string>();
  for (const profile of data ?? []) {
    if (profile.auth_user_id && profile.full_name) {
      map.set(profile.auth_user_id, profile.full_name);
    }
  }
  return map;
}

function augmentWithDeletedByName<T extends { deleted_by: string | null }>(
  rows: T[],
  nameMap: Map<string, string>
): WithDeletedByName<T>[] {
  return rows.map((row) => ({
    ...row,
    deleted_by_name: row.deleted_by ? (nameMap.get(row.deleted_by) ?? null) : null,
  }));
}

// ---- Get functions ----

export async function getTrashContacts(): Promise<WithDeletedByName<Contact>[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Contact[];
  const nameMap = await resolveDeletedByNames(supabase, rows);
  return augmentWithDeletedByName(rows, nameMap);
}

export async function getTrashTeams(): Promise<WithDeletedByName<Team>[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Team[];
  const nameMap = await resolveDeletedByNames(supabase, rows);
  return augmentWithDeletedByName(rows, nameMap);
}

export async function getTrashSponsors(): Promise<WithDeletedByName<Sponsor>[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sponsors")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Sponsor[];
  const nameMap = await resolveDeletedByNames(supabase, rows);
  return augmentWithDeletedByName(rows, nameMap);
}

export async function getTrashSponsorshipItems(): Promise<WithDeletedByName<SponsorshipItem>[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sponsorship_items")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as SponsorshipItem[];
  const nameMap = await resolveDeletedByNames(supabase, rows);
  return augmentWithDeletedByName(rows, nameMap);
}

export async function getTrashPhotos(): Promise<WithDeletedByName<Photo>[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Photo[];
  const nameMap = await resolveDeletedByNames(supabase, rows);
  return augmentWithDeletedByName(rows, nameMap);
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
