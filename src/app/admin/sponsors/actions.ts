"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { softDelete } from "@/lib/supabase/soft-delete";
import type { Sponsor, SponsorshipItem } from "@/types/database";

export async function getSponsors(): Promise<Sponsor[]> {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const { data, error } = await supabase
    .from("sponsors_active")
    .select("*")
    .eq("year", currentYear)
    .order("display_order");

  if (error) throw new Error(error.message);
  // sponsors_active view inherits NOT NULL from underlying sponsors table;
  // Supabase types views as fully-nullable, so assert here.
  return (data ?? []) as unknown as Sponsor[];
}

export async function getSponsorshipItems(): Promise<Pick<SponsorshipItem, "id" | "name" | "price_cents" | "year">[]> {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const { data, error } = await supabase
    .from("sponsorship_items_active")
    .select("id, name, price_cents, year")
    .eq("year", currentYear)
    .eq("active", true)
    .order("sort_order")
    .order("price_cents", { ascending: false });

  if (error) throw new Error(error.message);
  // sponsorship_items_active view inherits NOT NULL from underlying table;
  // Supabase types views as fully-nullable, so assert here.
  return (data ?? []) as unknown as Pick<SponsorshipItem, "id" | "name" | "price_cents" | "year">[];
}

export async function createSponsor(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("sponsors").insert({
    tier_id: formData.get("tier_id") as string,
    name: formData.get("name") as string,
    website: (formData.get("website") as string) || null,
    contact_name: (formData.get("contact_name") as string) || null,
    contact_email: (formData.get("contact_email") as string) || null,
    contact_phone: (formData.get("contact_phone") as string) || null,
    logo_url: (formData.get("logo_url") as string) || null,
    payment_status: ((formData.get("payment_status") as string) || "pending") as "pending" | "paid" | "comped",
    amount_paid_cents: Math.round((parseFloat(formData.get("amount_paid") as string) || 0) * 100),
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/sponsors");
  revalidatePath("/sponsors");
  return { success: true };
}

export async function updateSponsor(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("sponsors")
    .update({
      tier_id: formData.get("tier_id") as string,
      name: formData.get("name") as string,
      website: (formData.get("website") as string) || null,
      contact_name: (formData.get("contact_name") as string) || null,
      contact_email: (formData.get("contact_email") as string) || null,
      contact_phone: (formData.get("contact_phone") as string) || null,
      logo_url: (formData.get("logo_url") as string) || null,
      payment_status: ((formData.get("payment_status") as string) || "pending") as "pending" | "paid" | "comped",
      amount_paid_cents: Math.round((parseFloat(formData.get("amount_paid") as string) || 0) * 100),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/sponsors");
  revalidatePath("/sponsors");
  return { success: true };
}

export async function deleteSponsor(
  id: string
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();
  return softDelete(supabase, "sponsors", id);
}

export async function uploadSponsorLogo(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const file = formData.get("file") as File;
  if (!file || file.size === 0) return { error: "No file provided" };

  const ext = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from("logos")
    .upload(fileName, file);

  if (error) return { error: error.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("logos").getPublicUrl(fileName);

  return { url: publicUrl };
}
