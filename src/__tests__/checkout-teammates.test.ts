/**
 * S9-4a: Registration with teammates — creates contact rows + team_members.
 *
 * Tests assert:
 * 1. Non-TBD teammates each get a contact upsert + team_members insert.
 * 2. TBD entries are skipped (no contact, no team_members row).
 * 3. Captain always gets a contact + slot-1 team_member.
 * 4. captain_contact_id is updated on the teams row.
 * 5. Session cap is still enforced (RPC SESSION_FULL → 400).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock: @/lib/stripe
// ---------------------------------------------------------------------------
const mockSessionCreate = vi
  .fn()
  .mockResolvedValue({ url: "https://stripe.com/pay/cs_test" });

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: { sessions: { create: mockSessionCreate } },
  }),
  REGISTRATION_PRICE_CENTS: 70000,
}));

// ---------------------------------------------------------------------------
// Mock: next/headers
// ---------------------------------------------------------------------------
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Mock: @/lib/supabase/server
// ---------------------------------------------------------------------------
const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockCreateClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const CAPTAIN = {
  team_name: "Team Birdie",
  captain_name: "Alice Smith",
  captain_email: "alice@example.com",
  captain_phone: "555-0100",
  session: "morning",
};

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

/** Build a contacts.upsert / insert chain that returns a contact id. */
function makeContactChain(contactId: string) {
  return {
    upsert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: contactId }, error: null }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: contactId }, error: null }),
      }),
    }),
  };
}

/** Build a team_members insert chain (always succeeds). */
const mockTeamMembersInsert = vi.fn().mockResolvedValue({ error: null });
const teamMembersChain = {
  insert: mockTeamMembersInsert,
};

/** Build a teams update chain (always succeeds). */
const mockTeamsUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ error: null }),
});
const teamsChain = { update: mockTeamsUpdate };

const mockEventSettingsChain = {
  select: () => ({
    eq: () => ({
      single: vi.fn().mockResolvedValue({
        data: {
          registration_open: true,
          morning_cap: 20,
          afternoon_cap: 20,
          registration_fee_cents: 70000,
        },
        error: null,
      }),
    }),
  }),
};

// Contact id map used across tests
const CAPTAIN_CONTACT_ID = "contact-captain-uuid";
const TEAMMATE1_CONTACT_ID = "contact-teammate1-uuid";
const TEAMMATE2_CONTACT_ID = "contact-teammate2-uuid";

function setupMocks() {
  vi.clearAllMocks();

  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-test";
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

  // RPC happy path
  mockRpc.mockResolvedValue({
    data: { team_id: "team-uuid", registration_fee_cents: 70000 },
    error: null,
  });

  mockTeamMembersInsert.mockResolvedValue({ error: null });
  mockTeamsUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

  // contacts chains: captain + two teammates
  const captainContactChain = makeContactChain(CAPTAIN_CONTACT_ID);
  const teammate1ContactChain = makeContactChain(TEAMMATE1_CONTACT_ID);
  const teammate2ContactChain = makeContactChain(TEAMMATE2_CONTACT_ID);

  let contactCallCount = 0;
  const contactChains = [captainContactChain, teammate1ContactChain, teammate2ContactChain];

  mockFrom.mockImplementation((table: string) => {
    if (table === "event_settings") return mockEventSettingsChain;
    if (table === "team_members") return teamMembersChain;
    if (table === "teams") return teamsChain;
    if (table === "contacts") {
      const chain = contactChains[contactCallCount] ?? makeContactChain(`contact-extra-${contactCallCount}`);
      contactCallCount++;
      return chain;
    }
    return {};
  });

  mockCreateClient.mockResolvedValue({
    from: mockFrom,
    rpc: mockRpc,
  });
}

beforeEach(setupMocks);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("S9-4a checkout teammates", () => {
  describe("2 non-TBD teammates → 3 team_members rows", () => {
    it("inserts captain + 2 player team_members when 2 non-TBD teammates provided", async () => {
      const { POST } = await import("@/app/api/checkout/route");

      const body = {
        ...CAPTAIN,
        teammates: [
          { full_name: "Bob Jones", email: "bob@example.com", tbd: false },
          { full_name: "Carol Lee", email: "carol@example.com", tbd: false },
        ],
      };

      const response = await POST(makeRequest(body));
      expect(response.status).toBe(200);

      // team_members.insert should have been called 3 times
      expect(mockTeamMembersInsert).toHaveBeenCalledTimes(3);

      const calls = mockTeamMembersInsert.mock.calls;
      // Slot 1 = captain
      expect(calls[0][0]).toMatchObject({ role: "captain", slot: 1 });
      // Slot 2 = first teammate
      expect(calls[1][0]).toMatchObject({ role: "player", slot: 2 });
      // Slot 3 = second teammate
      expect(calls[2][0]).toMatchObject({ role: "player", slot: 3 });
    });

    it("updates captain_contact_id on the team row", async () => {
      const { POST } = await import("@/app/api/checkout/route");

      await POST(
        makeRequest({
          ...CAPTAIN,
          teammates: [{ full_name: "Bob Jones", email: "bob@example.com", tbd: false }],
        })
      );

      expect(mockTeamsUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ captain_contact_id: CAPTAIN_CONTACT_ID })
      );
    });
  });

  describe("1 non-TBD + 2 TBD → 2 team_members rows", () => {
    it("only inserts captain + 1 player, skips TBD entries", async () => {
      const { POST } = await import("@/app/api/checkout/route");

      const body = {
        ...CAPTAIN,
        teammates: [
          { full_name: "Bob Jones", email: "bob@example.com", tbd: false },
          { full_name: "", tbd: true },
          { full_name: "", tbd: true },
        ],
      };

      const response = await POST(makeRequest(body));
      expect(response.status).toBe(200);

      // Only 2 inserts: captain (slot 1) + Bob (slot 2)
      expect(mockTeamMembersInsert).toHaveBeenCalledTimes(2);
      const calls = mockTeamMembersInsert.mock.calls;
      expect(calls[0][0]).toMatchObject({ role: "captain", slot: 1 });
      expect(calls[1][0]).toMatchObject({ role: "player", slot: 2 });
    });
  });

  describe("all TBD → only captain row", () => {
    it("inserts only the captain team_member when all teammates are TBD", async () => {
      const { POST } = await import("@/app/api/checkout/route");

      const body = {
        ...CAPTAIN,
        teammates: [
          { full_name: "", tbd: true },
          { full_name: "", tbd: true },
          { full_name: "", tbd: true },
        ],
      };

      const response = await POST(makeRequest(body));
      expect(response.status).toBe(200);

      expect(mockTeamMembersInsert).toHaveBeenCalledTimes(1);
      expect(mockTeamMembersInsert.mock.calls[0][0]).toMatchObject({ role: "captain", slot: 1 });
    });

    it("still creates Stripe checkout session when all teammates are TBD", async () => {
      const { POST } = await import("@/app/api/checkout/route");

      const body = {
        ...CAPTAIN,
        teammates: [{ full_name: "", tbd: true }],
      };

      const response = await POST(makeRequest(body));
      const json = await response.json();
      expect(json.url).toContain("stripe.com");
    });
  });

  describe("no teammates field → only captain row", () => {
    it("handles missing teammates field gracefully", async () => {
      const { POST } = await import("@/app/api/checkout/route");

      const response = await POST(makeRequest({ ...CAPTAIN }));
      expect(response.status).toBe(200);

      // Captain team_member only
      expect(mockTeamMembersInsert).toHaveBeenCalledTimes(1);
    });
  });

  describe("session cap still enforced", () => {
    it("returns 400 with 'full' message when RPC reports SESSION_FULL", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: "SESSION_FULL", message: "session is at capacity" },
      });

      const { POST } = await import("@/app/api/checkout/route");
      const response = await POST(makeRequest({ ...CAPTAIN }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error.toLowerCase()).toContain("full");
    });

    it("does NOT call Stripe or insert team_members when session is full", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: "SESSION_FULL", message: "session is at capacity" },
      });

      const { POST } = await import("@/app/api/checkout/route");
      await POST(makeRequest({ ...CAPTAIN }));

      expect(mockSessionCreate).not.toHaveBeenCalled();
      expect(mockTeamMembersInsert).not.toHaveBeenCalled();
    });
  });

  describe("roster failure is non-fatal", () => {
    it("still returns Stripe URL even if team_members insert fails", async () => {
      mockTeamMembersInsert.mockResolvedValue({
        error: { message: "DB connection lost" },
      });

      const { POST } = await import("@/app/api/checkout/route");
      const response = await POST(makeRequest({ ...CAPTAIN }));

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.url).toContain("stripe.com");
    });
  });
});
