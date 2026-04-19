"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { softDelete } from "@/lib/supabase/soft-delete";
import type { Photo } from "@/types/database";

export async function getPhotos(status?: "pending" | "approved" | "rejected") {
  await requireAdmin();
  const supabase = await createClient();

  let query = supabase
    .from("photos_active")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  // photos_active view inherits NOT NULL from underlying photos table;
  // Supabase types views as fully-nullable, so assert here.
  return (data ?? []) as unknown as Photo[];
}

export async function updatePhotoStatus(
  id: string,
  status: "approved" | "rejected"
) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("photos")
    .update({ status })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/photos");
  revalidatePath("/gallery");
  return { success: true };
}

export async function deletePhoto(
  id: string
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();
  return softDelete(supabase, "photos", id);
}
