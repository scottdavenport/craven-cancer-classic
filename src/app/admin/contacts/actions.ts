"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import type { Contact } from "@/types/database";

type ContactType = "player" | "sponsor" | "donor" | "other";

interface ContactFilter {
  type?: ContactType;
  year?: number;
}

export async function getContacts(filter?: ContactFilter): Promise<Contact[]> {
  await requireAdmin();
  const supabase = await createClient();

  let query = supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });

  if (filter?.type) {
    query = query.eq("type", filter.type);
  }
  if (filter?.year) {
    query = query.eq("year_first_seen", filter.year);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function exportContactsCSV(filter?: ContactFilter): Promise<string> {
  await requireAdmin();
  const contacts = await getContacts(filter);

  const escapeCSV = (value: string | null | undefined): string => {
    if (value == null) return "";
    const str = String(value);
    if (str.includes('"') || str.includes(",") || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = "name,email,type,year_first_seen,notes,created_at";
  const rows = contacts.map((c) =>
    [
      escapeCSV(c.full_name),
      escapeCSV(c.email),
      escapeCSV(c.type),
      String(c.year_first_seen),
      escapeCSV(c.notes),
      c.created_at,
    ].join(",")
  );

  return [header, ...rows].join("\n");
}
