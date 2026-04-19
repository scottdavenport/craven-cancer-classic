"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { softDelete } from "@/lib/supabase/soft-delete";
import type { SponsorshipItem } from "@/types/database";

export async function getSponsorshipItems(): Promise<SponsorshipItem[]> {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const { data, error } = await supabase
    .from("sponsorship_items_active")
    .select("*")
    .eq("year", currentYear)
    .order("price_cents", { ascending: false });

  if (error) throw new Error(error.message);
  // sponsorship_items_active view inherits NOT NULL from underlying table;
  // Supabase types views as fully-nullable, so assert here.
  return (data ?? []) as unknown as SponsorshipItem[];
}

export async function getSponsorshipPurchases() {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const { data, error } = await supabase
    .from("sponsorship_purchases")
    .select("*")
    .eq("year", currentYear)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createSponsorshipItem(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("sponsorship_items").insert({
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
    price_cents: Math.round(parseFloat(formData.get("price") as string) * 100),
    max_quantity: parseInt(formData.get("max_quantity") as string) || null,
    active: formData.get("active") !== "false",
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/sponsorships");
  revalidatePath("/sponsorships");
  return { success: true };
}

export async function updateSponsorshipItem(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("sponsorship_items")
    .update({
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      price_cents: Math.round(parseFloat(formData.get("price") as string) * 100),
      max_quantity: parseInt(formData.get("max_quantity") as string) || null,
      active: formData.get("active") !== "false",
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/sponsorships");
  revalidatePath("/sponsorships");
  return { success: true };
}

export async function deleteSponsorshipItem(
  id: string
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();
  return softDelete(supabase, "sponsorship_items", id);
}
