/**
 * Regression test — S2-1: server-side sponsorship price fetch
 *
 * Verifies that handleSponsorshipCheckout ignores client-supplied price_cents
 * and always uses the price fetched from sponsorship_items in the DB.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Stripe mock ---
// Factory must not reference top-level vars (hoisted by vitest)
const mockSessionCreate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: { sessions: { create: mockSessionCreate } },
  }),
  REGISTRATION_PRICE_CENTS: 70000,
}));

// --- next/headers mock ---
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

// --- Supabase mock ---
// Use vi.hoisted so vars are available inside the hoisted vi.mock factory
const { mockFrom, mockCreateClient } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockCreateClient = vi.fn().mockResolvedValue({ from: mockFrom });
  return { mockFrom, mockCreateClient };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

// Import after mocks
import { POST } from "@/app/api/checkout/route";

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

/** Build a minimal chainable Supabase select mock that resolves .single() */
function makeItemSelectChain(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ eq, single }));
  const select = vi.fn(() => ({ eq, single }));
  return { select };
}

/** Build a minimal chainable Supabase insert mock that resolves .select().single() */
function makeInsertChain(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const selectAfterInsert = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select: selectAfterInsert }));
  return { insert };
}

const ACTIVE_GOLD_ITEM = {
  id: "item-uuid-gold",
  name: "Gold Hole Sponsor",
  price: 1000.0,
  active: true,
};

const validSponsorshipBody = {
  type: "sponsorship",
  item_id: "item-uuid-gold",
  // Tampered — client tries to pay $0.01
  price_cents: 1,
  purchaser_name: "Jane Doe",
  purchaser_email: "jane@example.com",
};

beforeEach(() => {
  vi.clearAllMocks();

  // Default happy-path: item found + active, purchase insert succeeds
  mockFrom.mockImplementation((table: string) => {
    if (table === "sponsorship_items") {
      return makeItemSelectChain({ data: ACTIVE_GOLD_ITEM, error: null });
    }
    if (table === "sponsorship_purchases") {
      return makeInsertChain({ data: { id: "purchase-uuid-1" }, error: null });
    }
    return {};
  });

  mockCreateClient.mockResolvedValue({ from: mockFrom });
  mockSessionCreate.mockResolvedValue({ url: "https://checkout.stripe.com/pay/test" });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/checkout — sponsorship path (S2-1)", () => {
  describe("price integrity: tampered price_cents is ignored", () => {
    it("creates Stripe session with DB price (100000 cents = $1000), not tampered price_cents=1", async () => {
      const res = await POST(makeRequest(validSponsorshipBody));
      expect(res.status).toBe(200);

      expect(mockSessionCreate).toHaveBeenCalledTimes(1);
      const call = mockSessionCreate.mock.calls[0][0] as {
        line_items: { price_data: { unit_amount: number } }[];
      };
      // DB price = $1000.00 → 100000 cents — NOT the tampered 1
      expect(call.line_items[0].price_data.unit_amount).toBe(100000);
    });

    it("uses Math.round for cent conversion (e.g. $99.99 → 9999)", async () => {
      const silverItem = { id: "item-uuid-silver", name: "Silver Sponsor", price: 99.99, active: true };
      mockFrom.mockImplementation((table: string) => {
        if (table === "sponsorship_items") {
          return makeItemSelectChain({ data: silverItem, error: null });
        }
        if (table === "sponsorship_purchases") {
          return makeInsertChain({ data: { id: "purchase-uuid-2" }, error: null });
        }
        return {};
      });

      const res = await POST(makeRequest({ ...validSponsorshipBody, item_id: "item-uuid-silver" }));
      expect(res.status).toBe(200);

      const call = mockSessionCreate.mock.calls[0][0] as {
        line_items: { price_data: { unit_amount: number } }[];
      };
      expect(call.line_items[0].price_data.unit_amount).toBe(9999);
    });
  });

  describe("item validation", () => {
    it("returns 400 when item_id does not exist in DB", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "sponsorship_items") {
          return makeItemSelectChain({ data: null, error: { message: "not found" } });
        }
        return {};
      });

      const res = await POST(makeRequest(validSponsorshipBody));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/not found/i);

      // Must not create a Stripe session
      expect(mockSessionCreate).not.toHaveBeenCalled();
    });

    it("returns 400 when item exists but is inactive", async () => {
      const inactiveItem = { ...ACTIVE_GOLD_ITEM, active: false };
      mockFrom.mockImplementation((table: string) => {
        if (table === "sponsorship_items") {
          return makeItemSelectChain({ data: inactiveItem, error: null });
        }
        return {};
      });

      const res = await POST(makeRequest(validSponsorshipBody));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/no longer available/i);

      expect(mockSessionCreate).not.toHaveBeenCalled();
    });
  });

  describe("missing required fields", () => {
    it("returns 400 when item_id is missing", async () => {
      const body = { ...validSponsorshipBody };
      delete (body as Record<string, unknown>).item_id;
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(400);
    });

    it("returns 400 when purchaser_email is missing", async () => {
      const body = { ...validSponsorshipBody };
      delete (body as Record<string, unknown>).purchaser_email;
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(400);
    });

    it("returns 400 when purchaser_name is missing", async () => {
      const body = { ...validSponsorshipBody };
      delete (body as Record<string, unknown>).purchaser_name;
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(400);
    });
  });
});

// ---------------------------------------------------------------------------
// S2-4 — registration checkout: unit_amount wired to event_settings.registration_fee_cents
// ---------------------------------------------------------------------------

/** Build a chainable mock for event_settings .select().eq().single() */
function makeEventSettingsChain(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ eq, single }));
  const select = vi.fn(() => ({ eq, single }));
  return { select };
}

/** Build a chainable mock for teams .select(..., {count}).eq().eq() — returns count */
function makeTeamsCountChain(count: number) {
  const eqInner = vi.fn().mockResolvedValue({ count, error: null });
  const eqOuter = vi.fn(() => ({ eq: eqInner }));
  const select = vi.fn(() => ({ eq: eqOuter }));
  return { select };
}

/** Build a chainable mock for teams .insert().select().single() */
function makeTeamsInsertChain(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const selectAfterInsert = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select: selectAfterInsert }));
  return { insert };
}

const OPEN_SETTINGS_DEFAULT_FEE = {
  registration_open: true,
  morning_cap: 18,
  afternoon_cap: 18,
  registration_fee_cents: 70000,
};

const OPEN_SETTINGS_CUSTOM_FEE = {
  registration_open: true,
  morning_cap: 18,
  afternoon_cap: 18,
  registration_fee_cents: 80000,
};

const OPEN_SETTINGS_NULL_FEE = {
  registration_open: true,
  morning_cap: 18,
  afternoon_cap: 18,
  registration_fee_cents: null,
};

const validRegistrationBody = {
  team_name: "Team Alpha",
  captain_name: "John Smith",
  captain_email: "john@example.com",
  session: "morning",
};

describe("POST /api/checkout — registration path (S2-4)", () => {
  function setupRegistrationMocks(
    eventSettings: Record<string, unknown> | null,
    teamInsertResult = { data: { id: "team-uuid-1" }, error: null }
  ) {
    mockFrom.mockImplementation((table: string) => {
      if (table === "event_settings") {
        return makeEventSettingsChain({
          data: eventSettings,
          error: eventSettings === null ? { message: "no rows" } : null,
        });
      }
      if (table === "teams") {
        // Both the count query and insert query hit "teams".
        // The count query calls .select("*", {count, head}).eq().eq()
        // The insert query calls .insert().select().single()
        // Return an object that supports both shapes.
        const countChain = makeTeamsCountChain(0);
        const insertChain = makeTeamsInsertChain(teamInsertResult);
        return { ...countChain, ...insertChain };
      }
      if (table === "players") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionCreate.mockResolvedValue({ url: "https://checkout.stripe.com/pay/test" });
  });

  it("uses event_settings.registration_fee_cents (80000) when present", async () => {
    setupRegistrationMocks(OPEN_SETTINGS_CUSTOM_FEE);

    const res = await POST(makeRequest(validRegistrationBody));
    expect(res.status).toBe(200);

    expect(mockSessionCreate).toHaveBeenCalledTimes(1);
    const call = mockSessionCreate.mock.calls[0][0] as {
      line_items: { price_data: { unit_amount: number } }[];
    };
    expect(call.line_items[0].price_data.unit_amount).toBe(80000);
  });

  it("falls back to REGISTRATION_PRICE_CENTS (70000) when registration_fee_cents is null", async () => {
    setupRegistrationMocks(OPEN_SETTINGS_NULL_FEE);

    const res = await POST(makeRequest(validRegistrationBody));
    expect(res.status).toBe(200);

    expect(mockSessionCreate).toHaveBeenCalledTimes(1);
    const call = mockSessionCreate.mock.calls[0][0] as {
      line_items: { price_data: { unit_amount: number } }[];
    };
    expect(call.line_items[0].price_data.unit_amount).toBe(70000);
  });

  it("returns 400 when event_settings row is missing (registration closed guard unchanged)", async () => {
    setupRegistrationMocks(null);

    const res = await POST(makeRequest(validRegistrationBody));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/closed/i);

    expect(mockSessionCreate).not.toHaveBeenCalled();
  });

  it("uses default fee (70000) when registration_fee_cents equals the default", async () => {
    setupRegistrationMocks(OPEN_SETTINGS_DEFAULT_FEE);

    const res = await POST(makeRequest(validRegistrationBody));
    expect(res.status).toBe(200);

    const call = mockSessionCreate.mock.calls[0][0] as {
      line_items: { price_data: { unit_amount: number } }[];
    };
    expect(call.line_items[0].price_data.unit_amount).toBe(70000);
  });
});
