"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { softDelete } from "@/lib/supabase/soft-delete";
import type { SponsorshipItem } from "@/types/database";

export type SponsorshipItemWithCount = SponsorshipItem & { active_sponsor_count: number };

type SponsorshipCategory = "sponsorship" | "tribute" | "supporter";

export async function getSponsorshipItems(
  {
    category,
    year,
    status,
  }: {
    category?: SponsorshipCategory;
    year?: number;
    status?: "active" | "inactive" | "all";
  } = {}
): Promise<SponsorshipItemWithCount[]> {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();
  const resolvedYear = year ?? currentYear;

  // Query the base table directly so year, status, and deleted_at can all be combined.
  // The sponsorship_items_active view is a subset of this (deleted_at IS NULL + active = true);
  // we replicate those conditions here explicitly to support inactive/all status filters.
  let itemsQuery = supabase
    .from("sponsorship_items")
    .select("*")
    .eq("year", resolvedYear)
    .is("deleted_at", null);

  if (category !== undefined) {
    itemsQuery = itemsQuery.eq("category", category);
  }

  if (status === "active" || status === undefined) {
    itemsQuery = itemsQuery.eq("active", true);
  } else if (status === "inactive") {
    itemsQuery = itemsQuery.eq("active", false);
  }
  // status === "all" → no active filter applied; deleted_at IS NULL already above

  const [itemsRes, sponsorsRes] = await Promise.all([
    itemsQuery
      .order("sort_order", { ascending: true })
      .order("price_cents", { ascending: false }),
    supabase
      .from("sponsors_active")
      .select("tier_id")
      .eq("year", resolvedYear),
  ]);

  if (itemsRes.error) throw new Error(itemsRes.error.message);
  if (sponsorsRes.error) throw new Error(sponsorsRes.error.message);

  const countByTier = new Map<string, number>();
  (sponsorsRes.data ?? []).forEach((s) => {
    if (s.tier_id) countByTier.set(s.tier_id, (countByTier.get(s.tier_id) ?? 0) + 1);
  });

  // sponsorship_items_active view inherits NOT NULL from underlying table;
  // Supabase types views as fully-nullable, so assert here.
  return ((itemsRes.data ?? []) as unknown as SponsorshipItem[]).map((item) => ({
    ...item,
    active_sponsor_count: countByTier.get(item.id) ?? 0,
  }));
}

export async function getLinkedSponsorNames(tierId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sponsors_active")
    .select("name")
    .eq("tier_id", tierId)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((s) => s.name as string);
}

export async function getSponsorshipPurchases(
  { category }: { category?: SponsorshipCategory } = {}
) {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("sponsorship_purchases")
    .select("*, sponsorship_items!inner(category)")
    .eq("year", currentYear);

  if (category !== undefined) {
    // Filter by the joined sponsorship_items.category column.
    // Cast to any: Supabase type inference doesn't expose joined columns in .eq() overloads.
    query = query.eq("category", category);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createSponsorshipItem(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const categoryRaw = formData.get("category") as string | null;
  const category: SponsorshipCategory =
    categoryRaw === "tribute" || categoryRaw === "supporter"
      ? categoryRaw
      : "sponsorship";

  const { error } = await supabase.from("sponsorship_items").insert({
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
    price_cents: Math.round(parseFloat(formData.get("price") as string) * 100),
    max_quantity: parseInt(formData.get("max_quantity") as string) || null,
    active: formData.get("active") !== "false",
    category,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/sponsorships");
  revalidatePath("/sponsorships");
  return { success: true };
}

export async function updateSponsorshipItem(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const categoryRaw = formData.get("category") as string | null;
  const category: SponsorshipCategory =
    categoryRaw === "tribute" || categoryRaw === "supporter"
      ? categoryRaw
      : "sponsorship";

  const { error } = await supabase
    .from("sponsorship_items")
    .update({
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      price_cents: Math.round(parseFloat(formData.get("price") as string) * 100),
      max_quantity: parseInt(formData.get("max_quantity") as string) || null,
      active: formData.get("active") !== "false",
      category,
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
