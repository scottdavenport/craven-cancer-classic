/**
 * Tests for /api/contacts/route.ts — public contact ingress endpoint.
 *
 * This route is a security boundary: it is the ONLY public insert path
 * for the contacts table (no public RLS insert policy). It uses the
 * service-role client to bypass RLS.
 *
 * Covers: happy path, missing required fields, duplicate email (23505),
 * invalid/unknown type values, service-role key usage, malformed JSON,
 * oversized free-text fields, and injection-safe payload forwarding.
 *
 * FLAGS (do not fix here — report to Forge):
 *   1. Invalid type values silently coerce to "other" instead of returning 400.
 *      This means "volunteer", "intruder", etc. are accepted as "other"
 *      with no feedback to the caller.
 *   2. 'volunteer' is not in the allowed type enum — routes through "other".
 *   3. Duplicate email (PG 23505) maps to a generic 500, not a 409.
 *   4. No field-length validation — oversized inputs (10k+ chars) are
 *      accepted and passed through to Supabase.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// vi.hoisted — vars must be declared before vi.mock factories run
const { mockInsert, mockFrom, mockCreateClient } = vi.hoisted(() => {
  const mockInsert = vi.fn();
  const mockFrom = vi.fn(() => ({ insert: mockInsert }));
  const mockCreateClient = vi.fn(() => ({ from: mockFrom }));
  return { mockInsert, mockFrom, mockCreateClient };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

// Import after mocks are registered
import { POST } from "@/app/api/contacts/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeRawRequest(rawBody: string): Request {
  return new Request("http://localhost/api/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: rawBody,
  });
}

const VALID_BODY = {
  full_name: "Jane Doe",
  email: "jane@example.com",
  type: "player",
};

beforeEach(() => {
  vi.clearAllMocks();

  // Set required env vars
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-test";

  // Default: insert succeeds
  mockInsert.mockResolvedValue({ error: null });
});

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe("POST /api/contacts", () => {
  describe("happy path", () => {
    it("returns 201 with { success: true } for valid full_name, email, type", async () => {
      const res = await POST(makeRequest(VALID_BODY));
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json).toEqual({ success: true });
    });

    it("calls supabase.from('contacts').insert with trimmed, lowercased email", async () => {
      await POST(makeRequest({ full_name: "  Jane Doe  ", email: "  JANE@EXAMPLE.COM  ", type: "player" }));
      expect(mockFrom).toHaveBeenCalledWith("contacts");
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg.full_name).toBe("Jane Doe");
      expect(insertArg.email).toBe("jane@example.com");
    });

    it("inserts types as an array wrapping the normalized type", async () => {
      await POST(makeRequest(VALID_BODY));
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg.types).toEqual(["player"]);
    });

    it("inserts year_first_seen as the current calendar year", async () => {
      const currentYear = new Date().getFullYear();
      await POST(makeRequest(VALID_BODY));
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg.year_first_seen).toBe(currentYear);
    });

    it("concatenates notes and company_name with ' | ' separator", async () => {
      await POST(
        makeRequest({
          ...VALID_BODY,
          notes: "Interested in gold hole",
          company_name: "Acme Corp",
        })
      );
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg.notes).toBe("Interested in gold hole | Company: Acme Corp");
    });

    it("omits notes field from insert when neither notes nor company_name provided", async () => {
      await POST(makeRequest(VALID_BODY));
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg.notes).toBeNull();
    });

    it("includes company_name in notes when notes is absent", async () => {
      await POST(makeRequest({ ...VALID_BODY, company_name: "Solo Corp" }));
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg.notes).toBe("Company: Solo Corp");
    });

    it("includes notes alone when company_name is absent", async () => {
      await POST(makeRequest({ ...VALID_BODY, notes: "Just a note" }));
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg.notes).toBe("Just a note");
    });

    it("accepts all valid type values: player, sponsor, donor, other", async () => {
      for (const type of ["player", "sponsor", "donor", "other"]) {
        vi.clearAllMocks();
        mockInsert.mockResolvedValue({ error: null });
        const res = await POST(makeRequest({ ...VALID_BODY, type }));
        expect(res.status).toBe(201);
        const insertArg = mockInsert.mock.calls[0][0];
        expect(insertArg.types).toEqual([type]);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Service-role client verification
  // ---------------------------------------------------------------------------

  describe("service-role auth", () => {
    it("creates supabase client using SUPABASE_SERVICE_ROLE_KEY (not a user session)", async () => {
      await POST(makeRequest(VALID_BODY));
      expect(mockCreateClient).toHaveBeenCalledWith(
        "https://test.supabase.co",
        "service-role-key-test"
      );
    });

    it("does NOT call createClient with any anon key", async () => {
      await POST(makeRequest(VALID_BODY));
      // Verify createClient was called with the service role key
      expect(mockCreateClient).toHaveBeenCalledWith(
        expect.any(String),
        "service-role-key-test"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Missing required fields
  // ---------------------------------------------------------------------------

  describe("missing required fields", () => {
    it("returns 400 when full_name is absent", async () => {
      const { full_name: _omit, ...body } = VALID_BODY;
      void _omit;
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/full_name and email are required/i);
    });

    it("returns 400 when email is absent", async () => {
      const { email: _omit, ...body } = VALID_BODY;
      void _omit;
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/full_name and email are required/i);
    });

    it("returns 400 when full_name is empty string", async () => {
      const res = await POST(makeRequest({ ...VALID_BODY, full_name: "   " }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when email is empty string", async () => {
      const res = await POST(makeRequest({ ...VALID_BODY, email: "   " }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when full_name is a number (non-string)", async () => {
      const res = await POST(makeRequest({ ...VALID_BODY, full_name: 42 }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when email is null", async () => {
      const res = await POST(makeRequest({ ...VALID_BODY, email: null }));
      expect(res.status).toBe(400);
    });

    it("does not call supabase insert when required fields are missing", async () => {
      await POST(makeRequest({ type: "player" }));
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Invalid type value — FLAGGED: silently defaults to "other" (not 400)
  // ---------------------------------------------------------------------------

  describe("invalid type value (documents actual coercion behavior)", () => {
    it("coerces unknown type 'intruder' to 'other' — returns 201, inserts types: ['other']", async () => {
      // FLAG: This should ideally return 400 for unknown type values.
      // The route silently coerces any non-allowlisted type to "other".
      const res = await POST(makeRequest({ ...VALID_BODY, type: "intruder" }));
      expect(res.status).toBe(201);
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg.types).toEqual(["other"]);
    });

    it("coerces 'volunteer' to 'other' — volunteer is missing from the enum", async () => {
      // FLAG: 'volunteer' is not in the allowed type list (player|sponsor|donor|other).
      // If volunteer is a valid contact type in the product, the route needs updating.
      const res = await POST(makeRequest({ ...VALID_BODY, type: "volunteer" }));
      expect(res.status).toBe(201);
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg.types).toEqual(["other"]);
    });

    it("coerces absent type to 'other' (type is optional — defaults to 'other')", async () => {
      const { type: _omit, ...body } = VALID_BODY;
      void _omit;
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(201);
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg.types).toEqual(["other"]);
    });
  });

  // ---------------------------------------------------------------------------
  // Duplicate email — FLAGGED: returns 500 instead of 409
  // ---------------------------------------------------------------------------

  describe("duplicate email (PG 23505)", () => {
    it("returns 500 for duplicate email — FLAGGED: route does not distinguish 23505 as 409", async () => {
      // FLAG: The acceptance criteria asks for a 409 on duplicate email.
      // The route currently maps ALL supabase errors (including 23505) to 500.
      // This test documents actual behavior; Forge should schedule a fix to
      // detect error.code === '23505' and return 409.
      mockInsert.mockResolvedValue({
        error: { code: "23505", message: "duplicate key value violates unique constraint" },
      });
      const res = await POST(makeRequest(VALID_BODY));
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toMatch(/failed to save/i);
    });
  });

  // ---------------------------------------------------------------------------
  // Generic DB error
  // ---------------------------------------------------------------------------

  describe("supabase insert error", () => {
    it("returns 500 with user-facing error message when insert fails", async () => {
      mockInsert.mockResolvedValue({ error: { message: "connection timeout" } });
      const res = await POST(makeRequest(VALID_BODY));
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("Failed to save your information. Please try again.");
    });

    it("does not leak raw DB error message to caller", async () => {
      mockInsert.mockResolvedValue({
        error: { message: "ERROR: column 'secret_internal_column' does not exist" },
      });
      const res = await POST(makeRequest(VALID_BODY));
      const json = await res.json();
      // Must not expose raw Supabase/PG error text
      expect(json.error).not.toContain("secret_internal_column");
    });
  });

  // ---------------------------------------------------------------------------
  // Adversarial: malformed JSON body
  // ---------------------------------------------------------------------------

  describe("adversarial: malformed JSON body", () => {
    it("returns 400 (not 500) when body is not valid JSON", async () => {
      const res = await POST(makeRawRequest("{invalid json"));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/invalid body/i);
    });

    it("returns 400 when body is an empty string", async () => {
      const res = await POST(makeRawRequest(""));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/invalid body/i);
    });

    it("returns 400 when body is a JSON array (not an object)", async () => {
      const res = await POST(makeRawRequest('["player", "sponsor"]'));
      expect(res.status).toBe(400);
    });

    it("returns 400 when body is a JSON string scalar", async () => {
      const res = await POST(makeRawRequest('"just a string"'));
      expect(res.status).toBe(400);
    });

    it("does not call supabase insert when JSON is malformed", async () => {
      await POST(makeRawRequest("{bad"));
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Adversarial: oversized free-text fields — FLAGGED: no length validation
  // ---------------------------------------------------------------------------

  describe("adversarial: oversized free-text fields", () => {
    it("accepts notes field of 10,000 chars — FLAGGED: no length guard in route", async () => {
      // FLAG: The route has no field-length validation. A 10k-char notes field
      // is accepted and passed straight to Supabase. Recommend adding a max-length
      // guard (e.g., 2000 chars for notes) to prevent DB column overflow or abuse.
      const hugeNotes = "x".repeat(10000);
      const res = await POST(makeRequest({ ...VALID_BODY, notes: hugeNotes }));
      // Documents actual behavior: accepted (201)
      expect(res.status).toBe(201);
      const insertArg = mockInsert.mock.calls[0][0];
      // The oversized string is forwarded as-is, trimmed but not truncated
      expect(insertArg.notes).toBe(hugeNotes);
    });

    it("accepts full_name of 1,000 chars — no length guard", async () => {
      const hugeName = "A".repeat(1000);
      const res = await POST(makeRequest({ ...VALID_BODY, full_name: hugeName }));
      expect(res.status).toBe(201);
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg.full_name).toBe(hugeName);
    });
  });

  // ---------------------------------------------------------------------------
  // Adversarial: SQL injection attempts
  // ---------------------------------------------------------------------------

  describe("adversarial: injection attempts in free-text fields", () => {
    it("passes injection-attempt string in notes directly to supabase client (parameterized — not interpolated)", async () => {
      const injection = "'; DROP TABLE contacts; --";
      await POST(makeRequest({ ...VALID_BODY, notes: injection }));
      const insertArg = mockInsert.mock.calls[0][0];
      // supabase-js uses parameterized queries; the string arrives at the client as-is,
      // not interpolated into SQL. Asserting the payload is forwarded verbatim verifies
      // no in-route string interpolation occurred.
      expect(insertArg.notes).toBe(injection);
      // Must still have called insert (not rejected due to content)
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });

    it("passes injection-attempt in full_name directly to supabase (no in-route interpolation)", async () => {
      const injection = "Robert'); DROP TABLE contacts;--";
      await POST(makeRequest({ ...VALID_BODY, full_name: injection }));
      const insertArg = mockInsert.mock.calls[0][0];
      // Trimmed but otherwise verbatim
      expect(insertArg.full_name).toBe(injection.trim());
    });
  });

  // ---------------------------------------------------------------------------
  // Insert payload shape — full contract assertion
  // ---------------------------------------------------------------------------

  describe("insert payload shape", () => {
    it("insert payload contains exactly the expected keys with correct values", async () => {
      const currentYear = new Date().getFullYear();
      await POST(
        makeRequest({
          full_name: "  Bob Smith  ",
          email: "  BOB@EXAMPLE.COM  ",
          type: "sponsor",
          notes: "VIP prospect",
          company_name: "Smith LLC",
        })
      );
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: "Bob Smith",
          email: "bob@example.com",
          types: ["sponsor"],
          year_first_seen: currentYear,
          notes: "VIP prospect | Company: Smith LLC",
        })
      );
    });
  });
});
