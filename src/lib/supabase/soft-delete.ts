import type { SupabaseClient } from "@supabase/supabase-js";

export type SoftDeletableTable =
  | "contacts"
  | "teams"
  | "sponsors"
  | "sponsorship_items"
  | "photos";

export async function softDelete(
  supabase: SupabaseClient,
  table: SoftDeletableTable,
  id: string
): Promise<{ ok: true } | { error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthenticated" };

  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq("id", id);

  return error ? { error: error.message } : { ok: true };
}

export async function restore(
  supabase: SupabaseClient,
  table: SoftDeletableTable,
  id: string
): Promise<{ ok: true } | { error: string }> {
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: null, deleted_by: null })
    .eq("id", id);

  return error ? { error: error.message } : { ok: true };
}

export async function bulkSoftDelete(
  supabase: SupabaseClient,
  table: SoftDeletableTable,
  ids: string[]
): Promise<{ deleted: number } | { error: string }> {
  if (ids.length === 0) return { deleted: 0 };
  if (ids.length > 500) return { error: "Too many items — cap is 500 per call" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthenticated" };

  const { error, count } = await supabase
    .from(table)
    .update(
      { deleted_at: new Date().toISOString(), deleted_by: user.id },
      { count: "exact" }
    )
    .in("id", ids);

  if (error) return { error: error.message };
  return { deleted: count ?? ids.length };
}
