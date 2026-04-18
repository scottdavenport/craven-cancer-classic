/**
 * S4-5: POST /api/contacts error string
 *
 * Asserts that a malformed body returns { error: 'Invalid body' }.
 * Red-phase: current impl returns 'Invalid request body'. Once Flux updates
 * the route, this test passes.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock @supabase/supabase-js — not needed for this path but suppress imports
// ---------------------------------------------------------------------------
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      insert: () => Promise.resolve({ data: {}, error: null }),
    }),
  }),
}));

beforeEach(() => {
  vi.resetModules();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-test";
});

describe("S4-5 POST /api/contacts error string", () => {
  describe("malformed body", () => {
    it("returns { error: 'Invalid body' } when body is not valid JSON", async () => {
      const { POST } = await import("@/app/api/contacts/route");
      const request = new Request("http://localhost/api/contacts", {
        method: "POST",
        body: "not-json{{{{",
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      // S4-5: must be 'Invalid body', not 'Invalid request body'
      expect(json.error).toBe("Invalid body");
    });

    it("returns { error: 'Invalid body' } when body is null (empty)", async () => {
      const { POST } = await import("@/app/api/contacts/route");
      const request = new Request("http://localhost/api/contacts", {
        method: "POST",
        body: "null",
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe("Invalid body");
    });
  });
});
