"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { parseCSV, type CommitRow, type ImportPreview, type ImportResult } from "./csv-parser";

// ---------------------------------------------------------------------------
// Preview import (requires admin)
// ---------------------------------------------------------------------------

type ExistingContact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  zip: string | null;
  full_name: string;
};

function dedupeKey(
  firstName: string | null,
  lastName: string | null,
  zip: string | null
): string | null {
  const f = (firstName ?? "").toLowerCase().trim();
  const l = (lastName ?? "").toLowerCase().trim();
  const z = (zip ?? "").trim();
  if (f && l && z) return `${f}|${l}|${z}`;
  return null;
}

function dedupeKeyFromFullName(fullName: string, zip: string | null): string | null {
  const n = fullName.toLowerCase().trim();
  const z = (zip ?? "").trim();
  if (n && z) return `${n}|${z}`;
  return null;
}

export async function previewImport(csvText: string): Promise<ImportPreview> {
  await requireAdmin();
  const supabase = await createClient();

  const rows = parseCSV(csvText);

  // Single batch fetch of all existing contacts for dedupe
  const { data: existing, error } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, zip, full_name");

  if (error) throw new Error(error.message);

  // Build dedupe lookup maps
  const byNameZip = new Map<string, string>(); // key -> contact id
  const byFullNameZip = new Map<string, string>();

  for (const contact of existing ?? []) {
    const c = contact as ExistingContact;
    const key = dedupeKey(c.first_name, c.last_name, c.zip);
    if (key) byNameZip.set(key, c.id);

    const fallbackKey = dedupeKeyFromFullName(c.full_name, c.zip);
    if (fallbackKey) byFullNameZip.set(fallbackKey, c.id);
  }

  // Apply dedupe logic to each parsed row
  for (const row of rows) {
    if (!row.full_name) {
      row.status = "invalid";
      row.error = "No name or company to identify this contact";
      continue;
    }

    const key = dedupeKey(row.first_name, row.last_name, row.zip);
    if (key && byNameZip.has(key)) {
      row.status = "duplicate";
      row.duplicateOfId = byNameZip.get(key);
      continue;
    }

    // Fallback: if all three (first, last, zip) are empty, try full_name + zip
    if (!row.first_name && !row.last_name) {
      const fallbackKey = dedupeKeyFromFullName(row.full_name, row.zip);
      if (fallbackKey && byFullNameZip.has(fallbackKey)) {
        row.status = "duplicate";
        row.duplicateOfId = byFullNameZip.get(fallbackKey);
        continue;
      }
    }

    row.status = "new";
  }

  const importCount = rows.filter((r) => r.status === "new").length;
  const duplicateCount = rows.filter((r) => r.status === "duplicate").length;
  const invalidCount = rows.filter((r) => r.status === "invalid").length;

  return { rows, importCount, duplicateCount, invalidCount };
}

// ---------------------------------------------------------------------------
// Commit import (requires admin)
// ---------------------------------------------------------------------------

export async function commitImport(rows: CommitRow[]): Promise<ImportResult> {
  await requireAdmin();
  const supabase = await createClient();

  const toInsert = rows.filter((r) => r.status === "new");
  const skipped = rows.length - toInsert.length;

  if (toInsert.length === 0) {
    return { imported: 0, skipped, errors: [] };
  }

  const inserts = toInsert.map((row) => ({
    first_name: row.first_name,
    last_name: row.last_name,
    salutation: row.salutation,
    company: row.company,
    address1: row.address1,
    address2: row.address2,
    city: row.city,
    state: row.state,
    zip: row.zip,
    email: row.email ?? null,
    full_name: row.full_name,
    types: [row.type],
    source: "mailing_list_import_2026",
    marketing_consent: true,
    year_first_seen: 2026,
  }));

  const { error } = await supabase.from("contacts").insert(inserts);

  if (error) {
    return {
      imported: 0,
      skipped,
      errors: [error.message],
    };
  }

  return {
    imported: toInsert.length,
    skipped,
    errors: [],
  };
}
