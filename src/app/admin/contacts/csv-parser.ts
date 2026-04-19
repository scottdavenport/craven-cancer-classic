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
