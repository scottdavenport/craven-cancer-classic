"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import type { Contact } from "@/types/database";

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
