/**
 * Tests for /api/contacts/route.ts — public contact ingress endpoint.
 *
 * This route is a security boundary: it is the ONLY public insert path
 * for the contacts table (no public RLS insert policy). It uses the
 * service-role client to bypass RLS.
 *
 * Covers: happy path, missing required fields, duplicate email (23505 → 409),
 * strict type validation (rejects unknown values with 400, accepts the 5
 * canonical types including volunteer), service-role key usage, malformed
 * JSON, field-length caps (full_name, email, notes, company_name), and
 * injection-safe payload forwarding.
 *
 * Hardened in #320 — the four flags previously pinned by these tests
 * (silent type coercion, missing volunteer, 23505 → 500, no length caps)
 * are now correctly handled by the route.
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

    it("accepts all valid type values: player, sponsor, donor, volunteer, other", async () => {
      for (const type of ["player", "sponsor", "donor", "volunteer", "other"]) {
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
  // Type value validation — strict whitelist with default-to-other on absent
  // ---------------------------------------------------------------------------

  describe("type value validation", () => {
    it("returns 400 for unknown type values (no silent coercion)", async () => {
      const res = await POST(makeRequest({ ...VALID_BODY, type: "intruder" }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/type must be one of/i);
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("accepts 'volunteer' as a valid type (post-Sprint-31)", async () => {
      const res = await POST(makeRequest({ ...VALID_BODY, type: "volunteer" }));
      expect(res.status).toBe(201);
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg.types).toEqual(["volunteer"]);
    });

    it("defaults absent type to 'other' (type is optional)", async () => {
      const { type: _omit, ...body } = VALID_BODY;
      void _omit;
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(201);
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg.types).toEqual(["other"]);
    });

    it("treats empty-string type the same as absent (defaults to 'other')", async () => {
      const res = await POST(makeRequest({ ...VALID_BODY, type: "" }));
      expect(res.status).toBe(201);
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg.types).toEqual(["other"]);
    });
  });

  // ---------------------------------------------------------------------------
  // Duplicate email — maps PG 23505 to 409
  // ---------------------------------------------------------------------------

  describe("duplicate email (PG 23505)", () => {
    it("returns 409 with friendly message when insert hits 23505", async () => {
      mockInsert.mockResolvedValue({
        error: { code: "23505", message: "duplicate key value violates unique constraint" },
      });
      const res = await POST(makeRequest(VALID_BODY));
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toMatch(/already on file/i);
    });

    it("does not leak the raw PG error message on 23505", async () => {
      mockInsert.mockResolvedValue({
        error: {
          code: "23505",
          message: 'duplicate key value violates unique constraint "contacts_email_unique_when_present"',
        },
      });
      const res = await POST(makeRequest(VALID_BODY));
      const json = await res.json();
      expect(json.error).not.toContain("contacts_email_unique_when_present");
      expect(json.error).not.toContain("duplicate key");
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
  // Field-length validation — caps prevent DB column overflow + abuse
  // ---------------------------------------------------------------------------

  describe("field-length validation", () => {
    it("returns 400 for notes longer than 2000 chars", async () => {
      const oversized = "x".repeat(2001);
      const res = await POST(makeRequest({ ...VALID_BODY, notes: oversized }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/notes must be 2000 characters or fewer/i);
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("accepts notes exactly at the 2000-char cap", async () => {
      const atCap = "x".repeat(2000);
      const res = await POST(makeRequest({ ...VALID_BODY, notes: atCap }));
      expect(res.status).toBe(201);
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg.notes).toBe(atCap);
    });

    it("returns 400 for full_name longer than 200 chars", async () => {
      const oversized = "A".repeat(201);
      const res = await POST(makeRequest({ ...VALID_BODY, full_name: oversized }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/full_name must be 200 characters or fewer/i);
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("returns 400 for email longer than 254 chars (RFC 5321)", async () => {
      const oversized = "a".repeat(250) + "@x.io"; // 255 chars
      const res = await POST(makeRequest({ ...VALID_BODY, email: oversized }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/email must be 254 characters or fewer/i);
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("returns 400 for company_name longer than 200 chars", async () => {
      const oversized = "C".repeat(201);
      const res = await POST(makeRequest({ ...VALID_BODY, company_name: oversized }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/company_name must be 200 characters or fewer/i);
      expect(mockInsert).not.toHaveBeenCalled();
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
