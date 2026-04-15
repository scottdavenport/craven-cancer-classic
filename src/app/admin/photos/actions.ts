"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";

export async function getPhotos(status?: "pending" | "approved" | "rejected") {
  await requireAdmin();
  const supabase = await createClient();

  let query = supabase
    .from("photos")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
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

export async function deletePhoto(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  // Get photo URL to delete from storage
  const { data: photo } = await supabase
    .from("photos")
    .select("image_url")
    .eq("id", id)
    .single();

  if (photo?.image_url) {
    const path = photo.image_url.split("/photos/")[1];
    if (path) {
      await supabase.storage.from("photos").remove([path]);
    }
  }

  const { error } = await supabase.from("photos").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/photos");
  revalidatePath("/gallery");
  return { success: true };
}
