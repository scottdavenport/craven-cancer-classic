"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import type { Contact } from "@/types/database";
import {
  deriveFullName,
  normalizeEmail,
  isValidEmail,
  normalizePhone,
  isValidPhone,
  isValidZip,
} from "@/lib/contacts/contact-utils";

type ContactType = "player" | "sponsor" | "donor" | "other";

export interface ContactFilter {
  type?: ContactType;
  year?: number;
  company?: string;
  marketing_consent?: boolean;
  team_id?: string;
  captain_only?: boolean;
}

export interface TeamFilterOption {
  id: string;
  team_name: string;
}

export async function getContacts(filter?: ContactFilter): Promise<Contact[]> {
  await requireAdmin();
  const supabase = await createClient();

  if (filter?.team_id) {
    // Join through team_members to find contacts on a specific team
    const { data: members, error: membersError } = await supabase
      .from("team_members")
      .select("contact_id, role")
      .eq("team_id", filter.team_id);

    if (membersError) throw new Error(membersError.message);

    const contactIds = (members ?? [])
      .filter((m) => !filter.captain_only || m.role === "captain")
      .map((m) => m.contact_id);

    if (contactIds.length === 0) return [];

    let query = supabase
      .from("contacts")
      .select("*")
      .in("id", contactIds)
      .order("created_at", { ascending: false });

    if (filter.type) query = query.eq("type", filter.type);
    if (filter.year) query = query.eq("year_first_seen", filter.year);
    if (filter.company) query = query.ilike("company", `%${filter.company}%`);
    if (filter.marketing_consent !== undefined)
      query = query.eq("marketing_consent", filter.marketing_consent);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  if (filter?.captain_only) {
    // Contacts that are captains on any team (via team_members role='captain')
    const { data: captainMembers, error: captainError } = await supabase
      .from("team_members")
      .select("contact_id")
      .eq("role", "captain");

    if (captainError) throw new Error(captainError.message);

    const captainIds = (captainMembers ?? []).map((m) => m.contact_id);

    if (captainIds.length === 0) return [];

    let query = supabase
      .from("contacts")
      .select("*")
      .in("id", captainIds)
      .order("created_at", { ascending: false });

    if (filter.type) query = query.eq("type", filter.type);
    if (filter.year) query = query.eq("year_first_seen", filter.year);
    if (filter.company) query = query.ilike("company", `%${filter.company}%`);
    if (filter.marketing_consent !== undefined)
      query = query.eq("marketing_consent", filter.marketing_consent);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  let query = supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });

  if (filter?.type) query = query.eq("type", filter.type);
  if (filter?.year) query = query.eq("year_first_seen", filter.year);
  if (filter?.company) query = query.ilike("company", `%${filter.company}%`);
  if (filter?.marketing_consent !== undefined)
    query = query.eq("marketing_consent", filter.marketing_consent);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function exportContactsCSV(filter?: ContactFilter): Promise<string> {
  await requireAdmin();
  // Export always filters to marketing_consent = true (CAN-SPAM compliance)
  const consentFilter: ContactFilter = { ...filter, marketing_consent: true };
  const contacts = await getContacts(consentFilter);

  const escapeCSV = (value: string | number | boolean | null | undefined): string => {
    if (value == null) return "";
    const str = String(value);
    if (str.includes('"') || str.includes(",") || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header =
    "full_name,first_name,last_name,salutation,email,phone,type,company,address1,city,state,zip,marketing_consent,source,year_first_seen,notes,created_at";

  const rows = contacts.map((c) =>
    [
      escapeCSV(c.full_name),
      escapeCSV(c.first_name),
      escapeCSV(c.last_name),
      escapeCSV(c.salutation),
      escapeCSV(c.email),
      escapeCSV(c.phone),
      escapeCSV(c.type),
      escapeCSV(c.company),
      escapeCSV(c.address1),
      escapeCSV(c.city),
      escapeCSV(c.state),
      escapeCSV(c.zip),
      escapeCSV(c.marketing_consent),
      escapeCSV(c.source),
      String(c.year_first_seen),
      escapeCSV(c.notes),
      c.created_at,
    ].join(",")
  );

  return [header, ...rows].join("\n");
}

export async function getTeamsForFilter(): Promise<TeamFilterOption[]> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .select("id, team_name")
    .order("team_name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export type ContactInput = {
  salutation: string | null;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  type: "player" | "sponsor" | "donor" | "other";
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  marketing_consent: boolean;
  notes: string | null;
  year_first_seen: number;
};

export async function createContact(
  input: ContactInput
): Promise<{ id: string } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();

  // Presence check: at least one of first/last/company
  if (!input.first_name?.trim() && !input.last_name?.trim() && !input.company?.trim()) {
    return { error: "Contact needs a first/last name or a company" };
  }

  // Normalize + validate email
  const email = normalizeEmail(input.email);
  if (email && !isValidEmail(email)) {
    return { error: "Invalid email format" };
  }

  // Normalize + validate phone
  if (input.phone && !isValidPhone(input.phone)) {
    return { error: "Invalid phone number" };
  }
  const phone = normalizePhone(input.phone);

  // Validate ZIP
  if (input.zip && !isValidZip(input.zip)) {
    return { error: "ZIP must be 5 digits or 5+4 (e.g. 28562 or 28562-1234)" };
  }

  const full_name = deriveFullName(input.first_name, input.last_name, input.company);

  const { data, error } = await supabase
    .from("contacts")
    .insert([{ ...input, email, phone, full_name }])
    .select("id");

  if (error) {
    if (error.code === "23505") return { error: "Email already in use by another contact" };
    return { error: error.message };
  }

  const rows = data as Array<{ id: string }> | null;
  return { id: (rows?.[0]?.id ?? "") as string };
}

export async function updateContact(
  id: string,
  input: Partial<ContactInput>
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();

  let normalizedInput: Partial<ContactInput> & { full_name?: string } = { ...input };

  if ("email" in input) {
    const email = normalizeEmail(input.email ?? null);
    if (email && !isValidEmail(email)) return { error: "Invalid email format" };
    normalizedInput.email = email;
  }

  if ("phone" in input) {
    if (input.phone && !isValidPhone(input.phone)) return { error: "Invalid phone number" };
    normalizedInput.phone = normalizePhone(input.phone ?? null);
  }

  if ("zip" in input && input.zip && !isValidZip(input.zip)) {
    return { error: "ZIP must be 5 digits or 5+4 (e.g. 28562 or 28562-1234)" };
  }

  // If any name field is in the partial update, fetch existing + merge + re-derive full_name
  const hasNameChange = "first_name" in input || "last_name" in input || "company" in input;
  if (hasNameChange) {
    const { data: existing, error: fetchError } = await supabase
      .from("contacts")
      .select("first_name, last_name, company")
      .eq("id", id)
      .single();
    if (fetchError) return { error: fetchError.message };

    const merged = {
      first_name: "first_name" in input ? input.first_name ?? null : existing.first_name,
      last_name: "last_name" in input ? input.last_name ?? null : existing.last_name,
      company: "company" in input ? input.company ?? null : existing.company,
    };

    // Re-check presence against merged state
    if (!merged.first_name?.trim() && !merged.last_name?.trim() && !merged.company?.trim()) {
      return { error: "Contact needs a first/last name or a company" };
    }

    normalizedInput.full_name = deriveFullName(merged.first_name, merged.last_name, merged.company);
  }

  const { error } = await supabase
    .from("contacts")
    .update(normalizedInput)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: "Email already in use by another contact" };
    return { error: error.message };
  }

  return { ok: true };
}
