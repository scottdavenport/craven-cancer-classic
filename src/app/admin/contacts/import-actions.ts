"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ParsedRow = {
  // Source CSV fields
  golfer: "Yes" | "No" | "";
  salutation: string | null;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  email?: string | null; // trailing 11th column (Jim Hamilton edge)

  // Derived
  full_name: string;
  suggested_type: "player" | "sponsor" | "donor" | "other";

  // Status (set later by dedupe check)
  status: "new" | "duplicate" | "invalid";
  duplicateOfId?: string;
  error?: string;
};

export type CommitRow = ParsedRow & {
  // Admin may override suggested_type before commit
  type: "player" | "sponsor" | "donor" | "other";
};

export type ImportPreview = {
  rows: ParsedRow[];
  importCount: number;
  duplicateCount: number;
  invalidCount: number;
};

export type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

// ---------------------------------------------------------------------------
// CSV parser
// ---------------------------------------------------------------------------

/**
 * Parse a single CSV line respecting RFC 4180 quoting rules.
 * Returns an array of field strings.
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;

  while (i <= line.length) {
    if (i === line.length) {
      // Empty trailing field
      fields.push("");
      break;
    }

    if (line[i] === '"') {
      // Quoted field
      i++; // skip opening quote
      let field = "";
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            // Escaped quote
            field += '"';
            i += 2;
          } else {
            // Closing quote
            i++;
            break;
          }
        } else {
          field += line[i];
          i++;
        }
      }
      fields.push(field);
      // Consume comma after closing quote (if present)
      if (line[i] === ",") {
        i++;
      }
    } else {
      // Unquoted field — read until comma
      const start = i;
      while (i < line.length && line[i] !== ",") {
        i++;
      }
      fields.push(line.slice(start, i));
      if (line[i] === ",") {
        i++;
      }
    }

    // Check for end of string after consuming a separator
    if (i === line.length && line[line.length - 1] === ",") {
      // Trailing comma means empty last field
      fields.push("");
      break;
    }
  }

  return fields;
}

/**
 * Normalize a CSV field: trim whitespace, return null for empty strings.
 */
function norm(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Derive full_name from first/last with company fallback.
 */
function deriveFullName(
  first: string | null,
  last: string | null,
  company: string | null
): string {
  const parts = [first, last].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(" ");
  }
  return company ?? "";
}

/**
 * Derive suggested_type from golfer flag and company presence.
 */
function deriveSuggestedType(
  golfer: "Yes" | "No" | "",
  company: string | null
): "player" | "sponsor" | "donor" | "other" {
  if (golfer === "Yes") return "player";
  if (golfer === "No" && company) return "sponsor";
  if (golfer === "No" && !company) return "donor";
  return "other"; // blank golfer field
}

/**
 * Check if a string looks like an email address.
 */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Pure function. Takes raw CSV text and returns an array of parsed rows.
 * Handles:
 * - Header detection (first non-empty line)
 * - Quoted fields with embedded commas
 * - Empty lines skipped
 * - Jim Hamilton edge case: blank GOLFER, parenthetical COMPANY, trailing email in 11th column
 *
 * Expected header: GOLFER, SALUTATION, FIRST NAME, LAST NAME, COMPANY,
 *                  ADDRESS, ADDRESS2, CITY, STATE, ZIP, (empty/email)
 * Indices:         0       1          2          3         4        5        6        7     8      9    10
 */
export function parseCSV(csvText: string): ParsedRow[] {
  const lines = csvText.split(/\r?\n/);
  const rows: ParsedRow[] = [];
  let headerSkipped = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    // Skip empty lines
    if (trimmed.length === 0) continue;

    // Skip header line (first non-empty line)
    if (!headerSkipped) {
      headerSkipped = true;
      continue;
    }

    const fields = parseCSVLine(rawLine);

    // Extract fields by index
    const golferRaw = norm(fields[0] ?? "") ?? "";
    const golfer: "Yes" | "No" | "" =
      golferRaw === "Yes" ? "Yes" : golferRaw === "No" ? "No" : "";

    const salutation = norm(fields[1] ?? "");
    const first_name = norm(fields[2] ?? "");
    const last_name = norm(fields[3] ?? "");
    const company = norm(fields[4] ?? "");
    const address1 = norm(fields[5] ?? "");
    const address2 = norm(fields[6] ?? "");
    const city = norm(fields[7] ?? "");
    const state = norm(fields[8] ?? "");
    const zip = norm(fields[9] ?? "");

    // Jim Hamilton edge case: detect trailing email in 11th column (index 10+)
    // The header has no label for column 10, but some rows carry an email there.
    let email: string | null | undefined = undefined;
    if (fields.length > 10) {
      const trailing = norm(fields[10] ?? "");
      if (trailing && looksLikeEmail(trailing)) {
        email = trailing;
      }
    }

    const full_name = deriveFullName(first_name, last_name, company);
    const suggested_type = deriveSuggestedType(golfer, company);

    // Initial status is 'new'; dedupe check in previewImport will update it
    const row: ParsedRow = {
      golfer,
      salutation,
      first_name,
      last_name,
      company,
      address1,
      address2,
      city,
      state,
      zip,
      email,
      full_name,
      suggested_type,
      status: "new",
    };

    rows.push(row);
  }

  return rows;
}

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
    type: row.type,
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
