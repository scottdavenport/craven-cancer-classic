/**
 * S9-2a: CSV import server actions
 *
 * Tests for parseCSV (pure function) and previewImport / commitImport
 * (require admin + Supabase). Supabase client is fully mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock: next/headers — needed by createClient (server) and requireAdmin
// ---------------------------------------------------------------------------
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
  headers: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue(null),
  }),
}));

// ---------------------------------------------------------------------------
// Mock: Supabase server client
// ---------------------------------------------------------------------------
const mockContactsSelect = vi.fn();
const mockContactsInsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "admin-uid" } },
        error: null,
      }),
    },
    from: (table: string) => {
      if (table === "contacts") {
        return {
          select: mockContactsSelect,
          insert: mockContactsInsert,
        };
      }
      return {};
    },
  }),
}));

// ---------------------------------------------------------------------------
// Mock: requireAdmin — always succeeds in tests
// ---------------------------------------------------------------------------
vi.mock("@/lib/supabase/admin", () => ({
  requireAdmin: vi.fn().mockResolvedValue({
    id: "admin-profile-id",
    role: "admin",
    email: "admin@example.com",
    full_name: "Admin User",
    auth_user_id: "admin-uid",
    created_at: new Date().toISOString(),
  }),
}));

// ---------------------------------------------------------------------------
// Import after mocks are set up
// ---------------------------------------------------------------------------
import { previewImport, commitImport } from "@/app/admin/contacts/import-actions";
import { parseCSV } from "@/app/admin/contacts/csv-parser";
import type { CommitRow } from "@/app/admin/contacts/csv-parser";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HEADER = "GOLFER,SALUTATION,FIRST NAME,LAST NAME,COMPANY,ADDRESS,ADDRESS2,CITY,STATE,ZIP";

function csv(...dataLines: string[]): string {
  return [HEADER, ...dataLines].join("\n");
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-test";
});

// ---------------------------------------------------------------------------
// parseCSV — pure function tests
// ---------------------------------------------------------------------------

describe("parseCSV — basic parsing", () => {
  it("skips the header line and returns one row per data line", () => {
    const result = parseCSV(csv("Yes,,John,Doe,,,,,NC,27514"));
    expect(result).toHaveLength(1);
  });

  it("skips empty lines", () => {
    const result = parseCSV([HEADER, "", "Yes,,John,Doe,,,,,NC,27514", ""].join("\n"));
    expect(result).toHaveLength(1);
  });

  it("trims leading and trailing whitespace from fields", () => {
    const result = parseCSV(csv("Yes,,  John  , Doe ,,,,,NC, 27514 "));
    expect(result[0].first_name).toBe("John");
    expect(result[0].last_name).toBe("Doe");
    expect(result[0].zip).toBe("27514");
  });

  it("converts empty fields to null", () => {
    const result = parseCSV(csv("Yes,,,Doe,,,,,NC,27514"));
    expect(result[0].salutation).toBeNull();
    expect(result[0].first_name).toBeNull();
  });

  it("handles quoted fields containing commas", () => {
    const result = parseCSV(csv(`No,,Jane,Smith,"Acme, Inc.",123 Main St,,Raleigh,NC,27601`));
    expect(result[0].company).toBe("Acme, Inc.");
    expect(result[0].address1).toBe("123 Main St");
  });

  it("handles double-quote escaping inside quoted fields", () => {
    const result = parseCSV(csv(`No,,Jane,Smith,"Smith ""Holdings"" LLC",,,,,`));
    expect(result[0].company).toBe('Smith "Holdings" LLC');
  });
});

describe("parseCSV — suggested_type derivation", () => {
  it("GOLFER=Yes → player", () => {
    const [row] = parseCSV(csv("Yes,,John,Doe,,,,,NC,27514"));
    expect(row.suggested_type).toBe("player");
    expect(row.golfer).toBe("Yes");
  });

  it("GOLFER=No + COMPANY filled → sponsor", () => {
    const [row] = parseCSV(csv("No,,Jane,Smith,Acme Corp,,,,,"));
    expect(row.suggested_type).toBe("sponsor");
  });

  it("GOLFER=No + no COMPANY → donor", () => {
    const [row] = parseCSV(csv("No,,Jane,Smith,,,,,NC,27514"));
    expect(row.suggested_type).toBe("donor");
  });

  it("blank GOLFER → other", () => {
    const [row] = parseCSV(csv(",,,,,,,,,"));
    expect(row.suggested_type).toBe("other");
    expect(row.golfer).toBe("");
  });
});

describe("parseCSV — full_name derivation", () => {
  it("combines first and last name with a space", () => {
    const [row] = parseCSV(csv("Yes,,John,Doe,,,,,NC,27514"));
    expect(row.full_name).toBe("John Doe");
  });

  it("uses only last name when first name is empty", () => {
    const [row] = parseCSV(csv("Yes,,,Doe,,,,,NC,27514"));
    expect(row.full_name).toBe("Doe");
  });

  it("falls back to company when both first and last are empty", () => {
    const [row] = parseCSV(csv("No,,,, Acme Corp ,,,,,"));
    expect(row.full_name).toBe("Acme Corp");
  });

  it("returns empty string when all name fields are empty", () => {
    const [row] = parseCSV(csv(",,,,,,,,,"));
    expect(row.full_name).toBe("");
  });
});

describe("parseCSV — Jim Hamilton edge case", () => {
  it("detects blank GOLFER, parenthetical COMPANY, and trailing email in 11th column", () => {
    // Jim Hamilton row: blank GOLFER, company is "(Holly town hall)", email in 11th column
    const jimLine = `,,Jim,Hamilton,(Holly town hall),456 Oak Ave,,Washington,NC,27889,jim@example.com`;
    const [row] = parseCSV(csv(jimLine));

    expect(row.golfer).toBe("");
    expect(row.first_name).toBe("Jim");
    expect(row.last_name).toBe("Hamilton");
    expect(row.company).toBe("(Holly town hall)");
    expect(row.email).toBe("jim@example.com");
    expect(row.suggested_type).toBe("other"); // blank GOLFER → other
    expect(row.full_name).toBe("Jim Hamilton");
  });

  it("does not assign email when 11th column is not an email", () => {
    const line = `Yes,,John,Doe,,,,,NC,27514,NOT_AN_EMAIL`;
    const [row] = parseCSV(csv(line));
    expect(row.email).toBeUndefined();
  });

  it("leaves email undefined when no 11th column present", () => {
    const [row] = parseCSV(csv("Yes,,John,Doe,,,,,NC,27514"));
    expect(row.email).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// previewImport — dedupe logic
// ---------------------------------------------------------------------------

describe("previewImport — dedupe logic", () => {
  it("marks a row as duplicate when first+last+zip matches an existing contact", async () => {
    mockContactsSelect.mockReturnValue({
      data: [
        {
          id: "existing-uuid-1",
          first_name: "John",
          last_name: "Doe",
          zip: "27514",
          full_name: "John Doe",
        },
      ],
      error: null,
    });

    const csvText = csv("Yes,,John,Doe,,,,,NC,27514");
    const preview = await previewImport(csvText);

    expect(preview.rows[0].status).toBe("duplicate");
    expect(preview.rows[0].duplicateOfId).toBe("existing-uuid-1");
    expect(preview.duplicateCount).toBe(1);
    expect(preview.importCount).toBe(0);
  });

  it("dedupe match is case-insensitive", async () => {
    mockContactsSelect.mockReturnValue({
      data: [
        {
          id: "existing-uuid-2",
          first_name: "JANE",
          last_name: "SMITH",
          zip: "27601",
          full_name: "JANE SMITH",
        },
      ],
      error: null,
    });

    const csvText = csv("No,,jane,smith,,,,,NC,27601");
    const preview = await previewImport(csvText);

    expect(preview.rows[0].status).toBe("duplicate");
    expect(preview.rows[0].duplicateOfId).toBe("existing-uuid-2");
  });

  it("marks a row as new when no match found", async () => {
    mockContactsSelect.mockReturnValue({
      data: [
        {
          id: "other-uuid",
          first_name: "Alice",
          last_name: "Wonderland",
          zip: "99999",
          full_name: "Alice Wonderland",
        },
      ],
      error: null,
    });

    const csvText = csv("Yes,,John,Doe,,,,,NC,27514");
    const preview = await previewImport(csvText);

    expect(preview.rows[0].status).toBe("new");
    expect(preview.importCount).toBe(1);
  });

  it("marks a row as invalid when full_name is empty", async () => {
    mockContactsSelect.mockReturnValue({ data: [], error: null });

    // No first, last, or company
    const csvText = csv(",,,,,,,,,");
    const preview = await previewImport(csvText);

    expect(preview.rows[0].status).toBe("invalid");
    expect(preview.invalidCount).toBe(1);
  });

  it("returns correct counts for mixed new/duplicate/invalid rows", async () => {
    mockContactsSelect.mockReturnValue({
      data: [
        {
          id: "dup-uuid",
          first_name: "John",
          last_name: "Doe",
          zip: "27514",
          full_name: "John Doe",
        },
      ],
      error: null,
    });

    const csvText = [
      HEADER,
      "Yes,,John,Doe,,,,,NC,27514",      // duplicate
      "No,,Jane,Smith,,,,,NC,27601",      // new
      ",,,,,,,,,",                         // invalid (no name)
    ].join("\n");

    const preview = await previewImport(csvText);

    expect(preview.importCount).toBe(1);
    expect(preview.duplicateCount).toBe(1);
    expect(preview.invalidCount).toBe(1);
    expect(preview.rows).toHaveLength(3);
  });

  it("falls back to full_name+zip dedupe when first and last are both empty", async () => {
    mockContactsSelect.mockReturnValue({
      data: [
        {
          id: "company-uuid",
          first_name: null,
          last_name: null,
          zip: "27514",
          full_name: "Acme Corp",
        },
      ],
      error: null,
    });

    // Company-only row
    const csvText = csv("No,,,, Acme Corp ,,,,,27514");
    const preview = await previewImport(csvText);

    expect(preview.rows[0].status).toBe("duplicate");
    expect(preview.rows[0].duplicateOfId).toBe("company-uuid");
  });
});

// ---------------------------------------------------------------------------
// commitImport
// ---------------------------------------------------------------------------

describe("commitImport", () => {
  it("inserts only rows with status=new and returns correct counts", async () => {
    mockContactsInsert.mockResolvedValue({ error: null });

    const rows: CommitRow[] = [
      {
        golfer: "Yes",
        salutation: null,
        first_name: "John",
        last_name: "Doe",
        company: null,
        address1: null,
        address2: null,
        city: "Raleigh",
        state: "NC",
        zip: "27514",
        full_name: "John Doe",
        suggested_type: "player",
        type: "player",
        status: "new",
      },
      {
        golfer: "No",
        salutation: null,
        first_name: "Jane",
        last_name: "Smith",
        company: null,
        address1: null,
        address2: null,
        city: "Durham",
        state: "NC",
        zip: "27701",
        full_name: "Jane Smith",
        suggested_type: "donor",
        type: "donor",
        status: "duplicate",
        duplicateOfId: "some-uuid",
      },
    ];

    const result = await commitImport(rows);

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(mockContactsInsert).toHaveBeenCalledTimes(1);
  });

  it("inserts with correct metadata fields (source, marketing_consent, year_first_seen)", async () => {
    let capturedInsert: unknown = null;
    mockContactsInsert.mockImplementation((data: unknown) => {
      capturedInsert = data;
      return Promise.resolve({ error: null });
    });

    const rows: CommitRow[] = [
      {
        golfer: "Yes",
        salutation: "Mr.",
        first_name: "Bob",
        last_name: "Jones",
        company: null,
        address1: "100 Main",
        address2: null,
        city: "Kinston",
        state: "NC",
        zip: "28501",
        full_name: "Bob Jones",
        suggested_type: "player",
        type: "player",
        status: "new",
      },
    ];

    await commitImport(rows);

    const inserted = (capturedInsert as Record<string, unknown>[])[0];
    expect(inserted.source).toBe("mailing_list_import_2026");
    expect(inserted.marketing_consent).toBe(true);
    expect(inserted.year_first_seen).toBe(2026);
  });

  it("returns 0 imported and skipped count when all rows are duplicate/invalid", async () => {
    const rows: CommitRow[] = [
      {
        golfer: "",
        salutation: null,
        first_name: "Jim",
        last_name: "Hamilton",
        company: "(Holly town hall)",
        address1: null,
        address2: null,
        city: null,
        state: null,
        zip: null,
        full_name: "Jim Hamilton",
        suggested_type: "other",
        type: "other",
        status: "duplicate",
        duplicateOfId: "existing-id",
      },
    ];

    const result = await commitImport(rows);

    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(1);
    expect(mockContactsInsert).not.toHaveBeenCalled();
  });

  it("returns errors array when Supabase insert fails", async () => {
    mockContactsInsert.mockResolvedValue({
      error: { message: "unique constraint violation" },
    });

    const rows: CommitRow[] = [
      {
        golfer: "No",
        salutation: null,
        first_name: "Error",
        last_name: "Case",
        company: null,
        address1: null,
        address2: null,
        city: null,
        state: null,
        zip: null,
        full_name: "Error Case",
        suggested_type: "donor",
        type: "donor",
        status: "new",
      },
    ];

    const result = await commitImport(rows);

    expect(result.imported).toBe(0);
    expect(result.errors).toContain("unique constraint violation");
  });
});
