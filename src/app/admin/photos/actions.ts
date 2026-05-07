"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { softDelete } from "@/lib/supabase/soft-delete";
import type { Photo } from "@/types/database";

export async function getPhotos(
  status?: "pending" | "approved" | "rejected",
  year?: number
) {
  await requireAdmin();
  const supabase = await createClient();

  let query = supabase
    .from("photos_active")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  if (year) {
    query = query.eq("year", year);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  // photos_active view inherits NOT NULL from underlying photos table;
  // Supabase types views as fully-nullable, so assert here.
  return (data ?? []) as unknown as Photo[];
}

const escapeCSV = (
  value: string | number | boolean | null | undefined
): string => {
  if (value == null) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export async function exportPhotosCSV(year?: number): Promise<string> {
  const photos = await getPhotos(undefined, year);

  const header = "id,status,year,caption,uploaded_by_name,uploaded_by_email,image_url,created_at";

  const rows = photos.map((p) =>
    [
      escapeCSV(p.id),
      escapeCSV(p.status),
      escapeCSV(p.year),
      escapeCSV(p.caption),
      escapeCSV(p.uploaded_by_name),
      escapeCSV(p.uploaded_by_email),
      escapeCSV(p.image_url),
      p.created_at,
    ].join(",")
  );

  return [header, ...rows].join("\n");
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
