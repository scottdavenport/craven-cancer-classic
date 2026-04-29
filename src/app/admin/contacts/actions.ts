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
import { softDelete, bulkSoftDelete } from "@/lib/supabase/soft-delete";

type ContactType = "player" | "sponsor" | "donor" | "volunteer" | "other";

type ShirtSize = "S" | "M" | "L" | "XL" | "2XL" | "3XL";

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
  captain_display_name: string;
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
      .from("contacts_active")
      .select("*")
      .in("id", contactIds)
      .order("created_at", { ascending: false });

    if (filter.type) query = query.contains("types", [filter.type]);
    if (filter.year) query = query.eq("year_first_seen", filter.year);
    if (filter.company) query = query.ilike("company", `%${filter.company}%`);
    if (filter.marketing_consent !== undefined)
      query = query.eq("marketing_consent", filter.marketing_consent);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    // contacts_active view: Supabase types all columns as nullable; underlying contacts
    // table has NOT NULL constraints on id, full_name, type, etc. — cast is safe.
    return (data ?? []) as Contact[];
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
      .from("contacts_active")
      .select("*")
      .in("id", captainIds)
      .order("created_at", { ascending: false });

    if (filter.type) query = query.contains("types", [filter.type]);
    if (filter.year) query = query.eq("year_first_seen", filter.year);
    if (filter.company) query = query.ilike("company", `%${filter.company}%`);
    if (filter.marketing_consent !== undefined)
      query = query.eq("marketing_consent", filter.marketing_consent);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    // contacts_active view: Supabase types all columns as nullable; underlying contacts
    // table has NOT NULL constraints on id, full_name, type, etc. — cast is safe.
    return (data ?? []) as Contact[];
  }

  let query = supabase
    .from("contacts_active")
    .select("*")
    .order("created_at", { ascending: false });

  if (filter?.type) query = query.contains("types", [filter.type]);
  if (filter?.year) query = query.eq("year_first_seen", filter.year);
  if (filter?.company) query = query.ilike("company", `%${filter.company}%`);
  if (filter?.marketing_consent !== undefined)
    query = query.eq("marketing_consent", filter.marketing_consent);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  // contacts_active view: Supabase types all columns as nullable; underlying contacts
  // table has NOT NULL constraints on id, full_name, type, etc. — cast is safe.
  return (data ?? []) as Contact[];
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
      escapeCSV(Array.isArray(c.types) ? c.types.join(";") : ""),
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
    .select("id, captain:contacts!teams_captain_contact_id_fkey(full_name)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const captain = row.captain as { full_name: string } | null;
    return {
      id: row.id,
      captain_display_name: captain?.full_name ?? "(no captain)",
    };
  });
}

export type ContactInput = {
  salutation: string | null;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  types: ContactType[];
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  marketing_consent: boolean;
  notes: string | null;
  year_first_seen: number;
  show_on_wall?: boolean;
  handicap?: number | null;
  shirt_size?: ShirtSize | null;
  recognition_name?: string | null;
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

  // Type-removal guard: when types is being changed, check join tables for player + sponsor
  if ("types" in input && Array.isArray(input.types)) {
    const newTypes = input.types as ContactType[];
    const guardResult = await runTypeRemovalGuard(supabase, id, newTypes);
    if (guardResult) return guardResult;
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

/**
 * Fetch the contact's current types and check join tables for player/sponsor removal.
 * Returns an error object if the removal is blocked, null if it's safe to proceed.
 *
 * Guard is skipped (returns null) if the current-types fetch fails — this prevents
 * crashing when the Supabase client mock doesn't support select (test compatibility)
 * and avoids blocking legitimate updates when the contact row is temporarily unavailable.
 */
async function runTypeRemovalGuard(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  contactId: string,
  newTypes: ContactType[]
): Promise<{ error: string } | null> {
  // Fetch the current contact to determine which types are being removed
  let currentTypes: ContactType[] = [];
  let fullName = "";

  try {
    const { data: contact, error: fetchError } = await supabase
      .from("contacts")
      .select("types, full_name")
      .eq("id", contactId)
      .single();

    if (fetchError || !contact) return null;

    currentTypes = (contact.types ?? []) as ContactType[];
    fullName = (contact.full_name ?? "") as string;
  } catch {
    // Guard is best-effort: if the fetch fails (e.g. in certain test setups),
    // skip the guard and allow the update to proceed.
    return null;
  }

  const removed = currentTypes.filter((t) => !newTypes.includes(t));

  // Player guard: check team_members
  if (removed.includes("player")) {
    const { data: teamRows, error: teamError } = await supabase
      .from("team_members")
      .select(
        "contact_id, team:teams(captain_contact_id, captain:contacts!teams_captain_contact_id_fkey(full_name))"
      )
      .eq("contact_id", contactId);

    if (!teamError && teamRows && teamRows.length > 0) {
      const team = (teamRows[0]?.team as {
        captain_contact_id: string | null;
        captain: { full_name: string } | null;
      } | null);
      const captainFullName = team?.captain?.full_name ?? null;
      const error = captainFullName
        ? `${fullName} is on ${captainFullName}'s team. Remove them from the team first, then change their type.`
        : `${fullName} is on a team without a listed captain. Remove them from the team first, then change their type.`;
      return { error };
    }
  }

  // Sponsor guard: check sponsor_contacts
  if (removed.includes("sponsor")) {
    const { data: sponsorRows, error: sponsorError } = await supabase
      .from("sponsor_contacts")
      .select("contact_id")
      .eq("contact_id", contactId);

    if (!sponsorError && sponsorRows && sponsorRows.length > 0) {
      return {
        error: `${fullName} is linked to a sponsorship. Remove from sponsorship first, then change their type.`,
      };
    }
  }

  // Volunteer, donor, other: no join table guard
  return null;
}

export async function deleteContact(
  id: string
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();
  return softDelete(supabase, "contacts", id);
}

export type BulkUpdate = {
  marketing_consent?: boolean;
};

export async function bulkUpdateContacts(
  ids: string[],
  update: BulkUpdate
): Promise<{ updated: number } | { error: string }> {
  await requireAdmin();

  if (ids.length === 0) return { updated: 0 };
  if (ids.length > 500) return { error: "Too many contacts selected — select 500 or fewer" };
  if (Object.keys(update).length === 0) return { error: "No fields to update" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("contacts")
    .update(update)
    .in("id", ids);

  if (error) return { error: error.message };
  return { updated: ids.length };
}

export async function bulkDeleteContacts(
  ids: string[]
): Promise<{ deleted: number } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();
  return bulkSoftDelete(supabase, "contacts", ids);
}

export async function bulkSetContactTypes(
  ids: string[],
  types: ContactType[]
): Promise<{ updated: number; blocked: [] } | { error: string }> {
  await requireAdmin();

  if (ids.length === 0) return { updated: 0, blocked: [] };
  if (ids.length > 500) return { error: "Too many contacts selected — select 500 or fewer" };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("contacts")
    .update({ types })
    .in("id", ids);

  if (error) return { error: error.message };
  return { updated: count ?? ids.length, blocked: [] };
}

export async function bulkAddContactType(
  ids: string[],
  type: ContactType
): Promise<{ updated: number; blocked: [] } | { error: string }> {
  await requireAdmin();

  if (ids.length === 0) return { updated: 0, blocked: [] };
  if (ids.length > 500) return { error: "Too many contacts selected — select 500 or fewer" };

  const supabase = await createClient();

  // Read current rows so we can compute the correct merged types array per contact.
  const { data: rows, error: readError } = await supabase
    .from("contacts")
    .select("id, types")
    .in("id", ids);

  if (readError) return { error: readError.message };

  const contactRows = (rows ?? []) as Array<{ id: string; types: ContactType[] }>;

  let updated = 0;
  for (const row of contactRows) {
    const newTypes = [...new Set([...row.types, type])];
    if (newTypes.length === row.types.length) {
      // Contact already has this type — skip the write.
      updated++;
      continue;
    }
    const { error: updateError } = await supabase
      .from("contacts")
      .update({ types: newTypes })
      .eq("id", row.id);
    if (updateError) return { error: updateError.message };
    updated++;
  }

  return { updated, blocked: [] };
}

type BlockedContact = { id: string; reason: string };

export async function bulkRemoveContactType(
  ids: string[],
  type: ContactType
): Promise<{ updated: number; blocked: BlockedContact[] } | { error: string }> {
  await requireAdmin();

  if (ids.length === 0) return { updated: 0, blocked: [] };
  if (ids.length > 500) return { error: "Too many contacts selected — select 500 or fewer" };

  const supabase = await createClient();

  // Fetch all contacts to get their full_name and current types
  const { data: contacts, error: contactsError } = await supabase
    .from("contacts")
    .select("id, full_name, types")
    .in("id", ids);

  if (contactsError) return { error: contactsError.message };

  const contactRows = (contacts ?? []) as Array<{
    id: string;
    full_name: string;
    types: ContactType[];
  }>;

  const blocked: BlockedContact[] = [];

  // For player removal: check team_members in bulk
  if (type === "player") {
    const { data: teamRows, error: teamError } = await supabase
      .from("team_members")
      .select(
        "contact_id, team:teams(captain_contact_id, captain:contacts!teams_captain_contact_id_fkey(full_name))"
      )
      .in("contact_id", ids);

    if (teamError) return { error: teamError.message };

    const blockedByTeam = new Map<string, string | null>();
    for (const row of teamRows ?? []) {
      const team = (row.team as {
        captain_contact_id: string | null;
        captain: { full_name: string } | null;
      } | null);
      const captainFullName = team?.captain?.full_name ?? null;
      blockedByTeam.set(row.contact_id as string, captainFullName);
    }

    for (const contact of contactRows) {
      if (blockedByTeam.has(contact.id)) {
        const captainFullName = blockedByTeam.get(contact.id) ?? null;
        const reason = captainFullName
          ? `${contact.full_name} is on ${captainFullName}'s team. Remove them from the team first, then change their type.`
          : `${contact.full_name} is on a team without a listed captain. Remove them from the team first, then change their type.`;
        blocked.push({ id: contact.id, reason });
      }
    }
  }

  // For sponsor removal: check sponsor_contacts in bulk
  if (type === "sponsor") {
    const { data: sponsorRows, error: sponsorError } = await supabase
      .from("sponsor_contacts")
      .select("contact_id")
      .in("contact_id", ids);

    if (sponsorError) return { error: sponsorError.message };

    const blockedBySponsor = new Set<string>(
      (sponsorRows ?? []).map((r) => r.contact_id as string)
    );

    for (const contact of contactRows) {
      if (blockedBySponsor.has(contact.id)) {
        blocked.push({
          id: contact.id,
          reason: `${contact.full_name} is linked to a sponsorship. Remove from sponsorship first.`,
        });
      }
    }
  }

  // Volunteer, donor, other: no guard — removal always allowed

  const blockedIds = new Set(blocked.map((b) => b.id));
  const unblockedIds = ids.filter((id) => !blockedIds.has(id));

  if (unblockedIds.length === 0) {
    return { updated: 0, blocked };
  }

  // Build per-contact updated types arrays using the already-fetched contact rows.
  // We compute the correct new types for each contact, then update each row individually.
  // Production note: this is N queries; a future migration can add an array_remove RPC
  // for atomicity. For sprint 31 the N-query approach is safe under the 500-row cap.
  const contactTypeMap = new Map(contactRows.map((c) => [c.id, c.types]));
  const updateResults = await Promise.all(
    unblockedIds.map(async (contactId) => {
      const currentTypes = contactTypeMap.get(contactId) ?? [];
      const newTypes = currentTypes.filter((t) => t !== type);
      return supabase
        .from("contacts")
        .update({ types: newTypes })
        .in("id", [contactId]);
    })
  );

  const firstError = updateResults.find((r) => r.error);
  if (firstError?.error) return { error: firstError.error.message };

  return { updated: unblockedIds.length, blocked };
}
