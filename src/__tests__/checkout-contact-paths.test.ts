/**
 * S9-5: checkout/route.ts — findOrCreateContact + splitName edge cases.
 *
 * The existing checkout tests (checkout-teammates.test.ts) cover the upsert-with-email
 * path for captain and teammates. This file covers:
 * - Teammate with no email → insert (not upsert) path
 * - Captain with single-word name (no space) → splitName returns first_name only, last_name null
 * - Teammate with email but upsert fails → error is logged but Stripe URL still returned
 *   (roster failure is non-fatal per S9-4a design)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
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
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const OPEN_EVENT = {
  registration_open: true,
  morning_cap: 20,
  afternoon_cap: 20,
  registration_fee_cents: 70000,
};

const mockEventSettingsChain = {
  select: () => ({
    eq: () => ({
      single: vi.fn().mockResolvedValue({ data: OPEN_EVENT, error: null }),
    }),
  }),
};

const CAPTAIN_BASE = {
  team_name: "Test Team",
  captain_name: "Alice Smith",
  captain_email: "alice@example.com",
  captain_phone: "555-0100",
  session: "morning",
};

function makeUpsertChain(contactId: string) {
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

function makeFailingInsertChain() {
  return {
    upsert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "insert failed" } }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "insert failed" } }),
      }),
    }),
  };
}

const mockTeamMembersInsert = vi.fn().mockResolvedValue({ error: null });
const mockTeamsUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ error: null }),
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-test";
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

  mockRpc.mockResolvedValue({
    data: { team_id: "team-uuid", registration_fee_cents: 70000 },
    error: null,
  });

  mockTeamMembersInsert.mockResolvedValue({ error: null });
  mockTeamsUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("checkout — findOrCreateContact no-email path", () => {
  it("uses insert (not upsert) when teammate has no email", async () => {
    // Captain has email (upsert path), teammate has no email (insert path)
    const captainChain = makeUpsertChain("captain-contact-id");
    const teammateChain = makeUpsertChain("teammate-contact-id");

    let contactCallCount = 0;
    const contactChains = [captainChain, teammateChain];

    mockFrom.mockImplementation((table: string) => {
      if (table === "event_settings") return mockEventSettingsChain;
      if (table === "team_members") return { insert: mockTeamMembersInsert };
      if (table === "teams") return { update: mockTeamsUpdate };
      if (table === "contacts") {
        const chain = contactChains[contactCallCount++] ?? makeUpsertChain("extra-id");
        return chain;
      }
      return {};
    });

    mockCreateClient.mockResolvedValue({ from: mockFrom, rpc: mockRpc });

    const { POST } = await import("@/app/api/checkout/route");

    const response = await POST(
      makeRequest({
        ...CAPTAIN_BASE,
        teammates: [
          // No email field — should use insert, not upsert
          { full_name: "No Email Player", tbd: false },
        ],
      })
    );

    expect(response.status).toBe(200);

    // The teammate contact chain's insert should have been called (no email → insert path)
    expect(teammateChain.insert).toHaveBeenCalled();
    // The teammate contact chain's upsert should NOT have been called
    expect(teammateChain.upsert).not.toHaveBeenCalled();
  });

  it("still returns Stripe URL when contact insert throws (non-fatal roster path)", async () => {
    // Captain chain succeeds, teammate chain throws to simulate findOrCreateContact failure
    const captainChain = makeUpsertChain("captain-id");
    const failingChain = makeFailingInsertChain();

    let contactCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "event_settings") return mockEventSettingsChain;
      if (table === "team_members") return { insert: mockTeamMembersInsert };
      if (table === "teams") return { update: mockTeamsUpdate };
      if (table === "contacts") {
        // First call = captain (succeeds), second call = teammate (fails)
        return contactCallCount++ === 0 ? captainChain : failingChain;
      }
      return {};
    });

    mockCreateClient.mockResolvedValue({ from: mockFrom, rpc: mockRpc });

    const { POST } = await import("@/app/api/checkout/route");

    const response = await POST(
      makeRequest({
        ...CAPTAIN_BASE,
        teammates: [{ full_name: "Fail Player", email: "fail@example.com", tbd: false }],
      })
    );

    // Roster failure is non-fatal — Stripe session still created
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.url).toContain("stripe.com");
  });
});

describe("checkout — splitName edge cases", () => {
  it("handles single-word captain name (no space) without error", async () => {
    // splitName('Cher') → { first_name: 'Cher', last_name: null }
    const captainChain = makeUpsertChain("captain-cher-id");

    mockFrom.mockImplementation((table: string) => {
      if (table === "event_settings") return mockEventSettingsChain;
      if (table === "team_members") return { insert: mockTeamMembersInsert };
      if (table === "teams") return { update: mockTeamsUpdate };
      if (table === "contacts") return captainChain;
      return {};
    });

    mockCreateClient.mockResolvedValue({ from: mockFrom, rpc: mockRpc });

    const { POST } = await import("@/app/api/checkout/route");

    const response = await POST(
      makeRequest({
        ...CAPTAIN_BASE,
        captain_name: "Cher", // single word, no space
      })
    );

    expect(response.status).toBe(200);
    // Upsert was called with the single-name captain payload
    expect(captainChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ full_name: "Cher", first_name: "Cher" }),
      expect.any(Object)
    );
  });

  it("handles captain name with multiple spaces correctly (splits on last space)", async () => {
    // splitName('Mary Jane Watson') → { first_name: 'Mary Jane', last_name: 'Watson' }
    const captainChain = makeUpsertChain("captain-mjw-id");

    mockFrom.mockImplementation((table: string) => {
      if (table === "event_settings") return mockEventSettingsChain;
      if (table === "team_members") return { insert: mockTeamMembersInsert };
      if (table === "teams") return { update: mockTeamsUpdate };
      if (table === "contacts") return captainChain;
      return {};
    });

    mockCreateClient.mockResolvedValue({ from: mockFrom, rpc: mockRpc });

    const { POST } = await import("@/app/api/checkout/route");

    await POST(
      makeRequest({
        ...CAPTAIN_BASE,
        captain_name: "Mary Jane Watson",
      })
    );

    expect(captainChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: "Mary Jane Watson",
        first_name: "Mary Jane",
        last_name: "Watson",
      }),
      expect.any(Object)
    );
  });
});
