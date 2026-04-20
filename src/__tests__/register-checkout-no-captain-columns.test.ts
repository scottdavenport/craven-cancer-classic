/**
 * S11-2 RED phase: /api/checkout registration end-to-end — no captain column writes.
 *
 * TARGET behavior (post-migration):
 * - POST /api/checkout with valid captain + team body → 200 + Stripe URL
 * - Contact created via contacts.upsert (captain info flows through contacts table)
 * - team_members row created with role='captain'
 * - teams row created (via RPC) WITHOUT captain_name / captain_email / captain_phone
 *   in any Supabase write payload originating from the route
 * - The public form still sends captain_* fields (unchanged), RPC accepts them,
 *   but they are NOT written as DB columns on teams.
 *
 * These tests FAIL today because:
 * - The current register_team RPC writes captain_name/email/phone into the teams row
 * - The checkout route calls register_team with real captain values, not just for contacts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockSessionCreate = vi
  .fn()
  .mockResolvedValue({ url: "https://stripe.com/pay/cs_test_reg_001" });

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: { sessions: { create: mockSessionCreate } },
  }),
  REGISTRATION_PRICE_CENTS: 70000,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockCreateClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

// ---------------------------------------------------------------------------
// Call-tracking state
// ---------------------------------------------------------------------------

/** All payloads written to teams table (insert or update) during a request. */
const teamsWritePayloads: Array<{ op: "insert" | "update"; payload: unknown }> = [];

/** All upsert payloads written to contacts table. */
const contactsUpsertPayloads: unknown[] = [];

/** All insert payloads written to team_members table. */
const teamMembersInsertPayloads: unknown[] = [];

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------
const CAPTAIN_CONTACT_ID = "captain-contact-uuid-001";
const TEAM_UUID = "team-uuid-checkout-001";

const OPEN_EVENT_SETTINGS = {
  registration_open: true,
  morning_cap: 20,
  afternoon_cap: 20,
  registration_fee_cents: 70000,
};

function setupFullCheckoutMocks() {
  // Clear tracking arrays
  teamsWritePayloads.length = 0;
  contactsUpsertPayloads.length = 0;
  teamMembersInsertPayloads.length = 0;

  // RPC returns new team_id
  mockRpc.mockResolvedValue({
    data: { team_id: TEAM_UUID, registration_fee_cents: 70000 },
    error: null,
  });

  mockFrom.mockImplementation((table: string) => {
    if (table === "event_settings") {
      return {
        select: () => ({
          eq: () => ({
            single: vi.fn().mockResolvedValue({ data: OPEN_EVENT_SETTINGS, error: null }),
          }),
        }),
      };
    }

    if (table === "contacts") {
      return {
        upsert: vi.fn((payload: unknown) => {
          contactsUpsertPayloads.push(payload);
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: CAPTAIN_CONTACT_ID }, error: null }),
            }),
          };
        }),
        insert: vi.fn((payload: unknown) => {
          contactsUpsertPayloads.push(payload);
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: CAPTAIN_CONTACT_ID }, error: null }),
            }),
          };
        }),
      };
    }

    if (table === "team_members") {
      return {
        insert: vi.fn((payload: unknown) => {
          teamMembersInsertPayloads.push(payload);
          return Promise.resolve({ error: null });
        }),
      };
    }

    if (table === "teams") {
      return {
        insert: vi.fn((payload: unknown) => {
          teamsWritePayloads.push({ op: "insert", payload });
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: TEAM_UUID }, error: null }),
            }),
          };
        }),
        update: vi.fn((payload: unknown) => {
          teamsWritePayloads.push({ op: "update", payload });
          return {
            eq: vi.fn().mockResolvedValue({ error: null }),
          };
        }),
      };
    }

    return {};
  });

  mockCreateClient.mockResolvedValue({
    from: mockFrom,
    rpc: mockRpc,
  });
}

function makeRegisterRequest(overrides: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      team_name: "Fairway Warriors",
      captain_name: "Bob Golfer",
      captain_email: "bob@golf.com",
      captain_phone: "555-1111",
      session: "morning",
      ...overrides,
    }),
  });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();

  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-test";
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

  setupFullCheckoutMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("S11-2 /api/checkout regression: teams row has no captain_* columns (RED phase)", () => {
  describe("POST /api/checkout happy path", () => {
    it("returns 200 with Stripe URL for valid captain + team body", async () => {
      const { POST } = await import("@/app/api/checkout/route");

      const response = await POST(makeRegisterRequest());

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.url).toContain("stripe.com");
    });

    it("calls register_team RPC with p_captain_name / p_captain_email (params still exist)", async () => {
      const { POST } = await import("@/app/api/checkout/route");

      await POST(makeRegisterRequest());

      expect(mockRpc).toHaveBeenCalledWith(
        "register_team",
        expect.objectContaining({
          p_captain_name: "Bob Golfer",
          p_captain_email: "bob@golf.com",
          p_session: "morning",
          p_team_name: "Fairway Warriors",
        })
      );
    });
  });

  describe("teams row write: captain_* columns must NOT appear", () => {
    it("no teams.insert or teams.update payload includes captain_name", async () => {
      const { POST } = await import("@/app/api/checkout/route");

      await POST(makeRegisterRequest());

      // Check all write payloads to teams — none should contain captain text columns
      for (const { payload } of teamsWritePayloads) {
        const p = payload as Record<string, unknown>;
        expect(p).not.toHaveProperty("captain_name");
      }

      // If no direct teams writes tracked (RPC handles it), that's fine —
      // but if any tracked write has captain columns, the test fails (as intended).
    });

    it("no teams.insert or teams.update payload includes captain_email", async () => {
      const { POST } = await import("@/app/api/checkout/route");

      await POST(makeRegisterRequest());

      for (const { payload } of teamsWritePayloads) {
        const p = payload as Record<string, unknown>;
        expect(p).not.toHaveProperty("captain_email");
      }
    });

    it("no teams.insert or teams.update payload includes captain_phone", async () => {
      const { POST } = await import("@/app/api/checkout/route");

      await POST(makeRegisterRequest());

      for (const { payload } of teamsWritePayloads) {
        const p = payload as Record<string, unknown>;
        expect(p).not.toHaveProperty("captain_phone");
      }
    });

    it("teams.update for captain_contact_id does not include deprecated captain text columns", async () => {
      const { POST } = await import("@/app/api/checkout/route");

      await POST(makeRegisterRequest());

      const captainContactUpdates = teamsWritePayloads.filter(
        ({ op, payload }) =>
          op === "update" &&
          (payload as Record<string, unknown>).captain_contact_id !== undefined
      );

      // At least one update should set captain_contact_id
      expect(captainContactUpdates.length).toBeGreaterThan(0);

      for (const { payload } of captainContactUpdates) {
        const p = payload as Record<string, unknown>;
        expect(p).not.toHaveProperty("captain_name");
        expect(p).not.toHaveProperty("captain_email");
        expect(p).not.toHaveProperty("captain_phone");
      }
    });
  });

  describe("contacts row: captain info written to contacts (not teams)", () => {
    it("contacts.upsert is called with captain_name as full_name", async () => {
      const { POST } = await import("@/app/api/checkout/route");

      await POST(makeRegisterRequest());

      // Captain info must flow to contacts table
      const captainContactWrite = contactsUpsertPayloads.find(
        (p) => (p as Record<string, unknown>).email === "bob@golf.com"
      );

      expect(captainContactWrite).toBeDefined();
      const payload = captainContactWrite as Record<string, unknown>;
      expect(payload.full_name).toBe("Bob Golfer");
      expect(payload.email).toBe("bob@golf.com");
    });

    it("contacts upsert payload does NOT also appear as a teams column write", async () => {
      const { POST } = await import("@/app/api/checkout/route");

      await POST(makeRegisterRequest());

      // Captain email must be in contacts, NOT in teams columns
      for (const { payload } of teamsWritePayloads) {
        const p = payload as Record<string, unknown>;
        // teams row must not have captain email as a string-typed column value
        expect(p.captain_email).toBeUndefined();
      }
    });
  });

  describe("team_members row: captain inserted with role='captain'", () => {
    it("team_members insert includes a row with role='captain' and captain_contact_id", async () => {
      const { POST } = await import("@/app/api/checkout/route");

      await POST(makeRegisterRequest());

      // Find the captain team_members insert
      const captainMemberWrite = teamMembersInsertPayloads.find((p) => {
        if (Array.isArray(p)) {
          return p.some((row: Record<string, unknown>) => row.role === "captain");
        }
        return (p as Record<string, unknown>).role === "captain";
      });

      expect(captainMemberWrite).toBeDefined();

      if (Array.isArray(captainMemberWrite)) {
        const captainRow = captainMemberWrite.find(
          (row: Record<string, unknown>) => row.role === "captain"
        );
        expect(captainRow).toBeDefined();
        expect(captainRow).toHaveProperty("contact_id");
        expect(captainRow).toHaveProperty("team_id");
        expect(captainRow).toHaveProperty("slot", 1);
      }
    });

    it("captain team_members row uses contact_id (not free-text captain_name)", async () => {
      const { POST } = await import("@/app/api/checkout/route");

      await POST(makeRegisterRequest());

      for (const payload of teamMembersInsertPayloads) {
        const rows = Array.isArray(payload) ? payload : [payload];
        for (const row of rows as Array<Record<string, unknown>>) {
          if (row.role === "captain") {
            // Must have contact_id
            expect(row).toHaveProperty("contact_id");
            // Must NOT have free-text captain_name as a column
            expect(row).not.toHaveProperty("captain_name");
            expect(row).not.toHaveProperty("captain_email");
          }
        }
      }
    });
  });

  describe("public form fields unchanged: captain_* still in request body", () => {
    it("route still accepts captain_name / captain_email / captain_phone in request body", async () => {
      const { POST } = await import("@/app/api/checkout/route");

      // Public form sends these fields — route must still accept them
      const response = await POST(
        makeRegisterRequest({
          captain_name: "Alice Pro",
          captain_email: "alice@pro.com",
          captain_phone: "555-2222",
        })
      );

      // Route accepts the request normally (captain fields still in form)
      expect(response.status).toBe(200);
    });

    it("missing captain_phone is still accepted (optional field)", async () => {
      const { POST } = await import("@/app/api/checkout/route");

      const response = await POST(
        makeRegisterRequest({
          captain_phone: undefined,
        })
      );

      expect(response.status).toBe(200);
    });

    it("missing required fields still returns 400", async () => {
      const { POST } = await import("@/app/api/checkout/route");

      const response = await POST(
        new Request("http://localhost/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ team_name: "Incomplete Team" }),
        })
      );

      expect(response.status).toBe(400);
    });
  });
});
