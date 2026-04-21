"use server";

import { revalidatePath } from "next/cache";
import sanitizeHtml from "sanitize-html";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { softDelete } from "@/lib/supabase/soft-delete";
import type { Sponsor, SponsorshipItem } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContactRow = {
  contact_id: string;
  role: string;
  contacts: {
    id: string;
    full_name: string;
    email: string | null;
  };
};

// ---------------------------------------------------------------------------
// getSponsors
// ---------------------------------------------------------------------------

export async function getSponsors(opts?: { year?: number; is_active?: boolean }): Promise<Sponsor[]> {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();
  const year = opts?.year ?? currentYear;

  // Query sponsors table directly — sponsors_active view uses SELECT * which
  // pins columns at creation time and won't expose is_active until PR C recreates it.
  // Soft-deleted rows are excluded by the RLS policy on the sponsors table.
  let query = supabase
    .from("sponsors")
    .select("*")
    .eq("year", year)
    .is("deleted_at", null);

  if (opts?.is_active !== undefined) {
    query = query.eq("is_active", opts.is_active);
  }

  const { data, error } = await query.order("display_order");

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Sponsor[];
}

// ---------------------------------------------------------------------------
// getSponsorshipItems
// ---------------------------------------------------------------------------

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
  return (data ?? []) as unknown as Pick<SponsorshipItem, "id" | "name" | "price_cents" | "year">[];
}

// ---------------------------------------------------------------------------
// getSponsorContacts
// ---------------------------------------------------------------------------

export async function getSponsorContacts(sponsorId: string): Promise<ContactRow[]> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sponsor_contacts")
    .select("contact_id, role, contacts(id, full_name, email)")
    .eq("sponsor_id", sponsorId);

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ContactRow[];
}

// ---------------------------------------------------------------------------
// linkSponsorContact
// ---------------------------------------------------------------------------

export async function linkSponsorContact(
  sponsorId: string,
  contactId: string,
  role: "primary" | "billing" | "other" = "primary"
): Promise<{ success: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("sponsor_contacts")
    .insert({ sponsor_id: sponsorId, contact_id: contactId, role });

  if (error) return { error: error.message };
  return { success: true };
}

// ---------------------------------------------------------------------------
// unlinkSponsorContact
// ---------------------------------------------------------------------------

export async function unlinkSponsorContact(
  sponsorId: string,
  contactId: string
): Promise<{ success: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("sponsor_contacts")
    .delete()
    .eq("sponsor_id", sponsorId)
    .eq("contact_id", contactId);

  if (error) return { error: error.message };
  return { success: true };
}

// ---------------------------------------------------------------------------
// createSponsor
// ---------------------------------------------------------------------------

export async function createSponsor(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const isActiveRaw = formData.get("is_active") as string | null;
  const is_active = isActiveRaw === "false" ? false : true;

  const contactIdsRaw = formData.get("contact_ids") as string | null;
  const contactIds = contactIdsRaw ? contactIdsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];

  // Pre-generate the id so we can reference it for sponsor_contacts without
  // needing a .select().single() chain (which isn't supported by test mocks).
  const sponsorId = crypto.randomUUID();

  const { data: insertResult, error } = await supabase
    .from("sponsors")
    .insert({
      id: sponsorId,
      tier_id: formData.get("tier_id") as string,
      name: formData.get("name") as string,
      website: (formData.get("website") as string) || null,
      logo_url: (formData.get("logo_url") as string) || null,
      payment_status: ((formData.get("payment_status") as string) || "pending") as "pending" | "paid" | "comped",
      amount_paid_cents: Math.round((parseFloat(formData.get("amount_paid") as string) || 0) * 100),
      is_active,
    });

  // In test mocks insert may return data directly; in production it returns { data: null }
  // unless .select() is chained. We use the pre-generated sponsorId regardless.
  void insertResult;
  if (error) return { error: error.message };

  if (contactIds.length > 0) {
    const rows = contactIds.map((contact_id) => ({
      sponsor_id: sponsorId,
      contact_id,
      role: "primary",
    }));
    const { error: linkError } = await supabase
      .from("sponsor_contacts")
      .insert(rows);
    if (linkError) return { error: linkError.message };
  }

  revalidatePath("/admin/sponsors");
  revalidatePath("/sponsors");
  return { success: true };
}

// ---------------------------------------------------------------------------
// updateSponsor
// ---------------------------------------------------------------------------

export async function updateSponsor(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const isActiveRaw = formData.get("is_active") as string | null;
  const is_active = isActiveRaw === "false" ? false : true;

  const { error } = await supabase
    .from("sponsors")
    .update({
      tier_id: formData.get("tier_id") as string,
      name: formData.get("name") as string,
      website: (formData.get("website") as string) || null,
      logo_url: (formData.get("logo_url") as string) || null,
      payment_status: ((formData.get("payment_status") as string) || "pending") as "pending" | "paid" | "comped",
      amount_paid_cents: Math.round((parseFloat(formData.get("amount_paid") as string) || 0) * 100),
      is_active,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  // Reconcile contacts: read current links, diff against submitted contact_ids
  const contactIdsRaw = formData.get("contact_ids") as string | null;
  if (contactIdsRaw !== null) {
    const submittedIds = contactIdsRaw.split(",").map((s) => s.trim()).filter(Boolean);

    const { data: existing } = await supabase
      .from("sponsor_contacts")
      .select("contact_id")
      .eq("sponsor_id", id);

    const existingIds = (existing ?? []).map((r: { contact_id: string }) => r.contact_id);

    const toAdd = submittedIds.filter((cid) => !existingIds.includes(cid));
    const toRemove = existingIds.filter((cid) => !submittedIds.includes(cid));

    if (toAdd.length > 0) {
      const rows = toAdd.map((contact_id) => ({
        sponsor_id: id,
        contact_id,
        role: "primary",
      }));
      const { error: addErr } = await supabase.from("sponsor_contacts").insert(rows);
      if (addErr) return { error: addErr.message };
    }

    for (const contact_id of toRemove) {
      const { error: delErr } = await supabase
        .from("sponsor_contacts")
        .delete()
        .eq("sponsor_id", id)
        .eq("contact_id", contact_id);
      if (delErr) return { error: delErr.message };
    }
  }

  revalidatePath("/admin/sponsors");
  revalidatePath("/sponsors");
  return { success: true };
}

// ---------------------------------------------------------------------------
// deleteSponsor
// ---------------------------------------------------------------------------

export async function deleteSponsor(
  id: string
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();
  return softDelete(supabase, "sponsors", id);
}

// ---------------------------------------------------------------------------
// SVG sanitization for logo upload
// ---------------------------------------------------------------------------

const SVG_ALLOWED_TAGS = [
  "svg", "g", "path", "circle", "rect", "ellipse", "line", "polyline", "polygon",
  "text", "tspan", "textPath", "defs", "linearGradient", "radialGradient", "stop",
  "symbol", "use", "mask", "clipPath", "pattern", "title", "desc",
  "filter", "feBlend", "feColorMatrix", "feComponentTransfer", "feComposite",
  "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feFlood",
  "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology",
  "feOffset", "feSpecularLighting", "feTile", "feTurbulence", "feFuncR",
  "feFuncG", "feFuncB", "feFuncA", "feDistantLight", "fePointLight", "feSpotLight",
];

const SVG_ALLOWED_ATTRS: Record<string, string[]> = {
  "*": [
    "id", "class", "style",
    "fill", "fill-rule", "fill-opacity", "stroke", "stroke-width", "stroke-linecap",
    "stroke-linejoin", "stroke-opacity", "stroke-dasharray", "stroke-dashoffset",
    "stroke-miterlimit", "opacity", "transform", "color",
    "x", "y", "width", "height", "cx", "cy", "r", "rx", "ry", "d",
    "x1", "y1", "x2", "y2", "points", "viewBox", "preserveAspectRatio",
    "version", "xmlns", "xmlns:xlink",
    "offset", "stop-color", "stop-opacity", "gradientUnits", "gradientTransform",
    "spreadMethod", "fx", "fy",
    "clip-path", "clip-rule", "mask",
    "text-anchor", "font-family", "font-size", "font-weight", "font-style",
    "dx", "dy", "dominant-baseline", "alignment-baseline",
    "result", "in", "in2", "values", "type", "mode", "stdDeviation", "order",
    "k1", "k2", "k3", "k4", "operator", "radius", "surfaceScale", "diffuseConstant",
    "specularConstant", "specularExponent", "kernelMatrix", "divisor", "bias",
    "targetX", "targetY", "edgeMode", "kernelUnitLength", "preserveAlpha",
    "elevation", "azimuth", "z", "pointsAtX", "pointsAtY", "pointsAtZ",
    "limitingConeAngle", "baseFrequency", "numOctaves", "seed", "stitchTiles",
  ],
};

function sanitizeSvg(text: string): string {
  return sanitizeHtml(text, {
    allowedTags: SVG_ALLOWED_TAGS,
    allowedAttributes: SVG_ALLOWED_ATTRS,
    allowedSchemes: ["data"],
    allowedSchemesByTag: {},
    parser: { lowerCaseTags: false, lowerCaseAttributeNames: false },
  });
}

async function isSvgContent(file: File): Promise<boolean> {
  if (file.type === "image/svg+xml") return true;
  const head = await file.slice(0, 1024).text();
  return /<svg\b/i.test(head);
}

async function sanitizeSvgIfNeeded(file: File): Promise<File> {
  if (!(await isSvgContent(file))) return file;
  const text = await file.text();
  const cleaned = sanitizeSvg(text);
  return new File([cleaned], file.name, { type: "image/svg+xml" });
}

export async function deleteSponsorLogo(
  oldLogoUrl: string
): Promise<{ success: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const fileName = oldLogoUrl.split("/").pop();
  if (!fileName) return { error: "Invalid logo URL" };

  const { error } = await supabase.storage.from("logos").remove([fileName]);
  if (error) return { error: error.message };
  return { success: true };
}

export async function uploadSponsorLogo(formData: FormData) {
  await requireAdmin();

  const file = formData.get("file") as File;
  if (!file || file.size === 0) return { error: "No file provided" };

  if (file.size > 5 * 1024 * 1024) return { error: "File too large (max 5MB)" };

  const supabase = await createClient();

  const oldLogoUrl = formData.get("oldLogoUrl") as string | null;
  if (oldLogoUrl) {
    const oldFileName = oldLogoUrl.split("/").pop();
    if (oldFileName) {
      await supabase.storage.from("logos").remove([oldFileName]);
    }
  }

  const sanitized = await sanitizeSvgIfNeeded(file);
  const ext = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from("logos")
    .upload(fileName, sanitized);

  if (error) return { error: error.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("logos").getPublicUrl(fileName);

  return { url: publicUrl };
}
