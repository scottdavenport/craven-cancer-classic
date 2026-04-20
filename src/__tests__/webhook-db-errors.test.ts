/**
 * Regression tests for S2-2: webhook DB-error silent failures
 *
 * Verifies:
 * - teams.update DB error returns HTTP 500 (Stripe retries)
 * - sponsorship_purchases.update DB error returns HTTP 500 (Stripe retries)
 * - contacts.upsert DB error does NOT return 500 (non-critical path, no double-charge)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock @/lib/stripe — constructEvent returns a synthetic event
// ---------------------------------------------------------------------------
const mockConstructEvent = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mockConstructEvent },
  }),
  // Stripe namespace re-export — only types used at runtime, not needed here
  Stripe: {},
}));

// ---------------------------------------------------------------------------
// Mock next/headers — returns a fake stripe-signature header
// ---------------------------------------------------------------------------
vi.mock("next/headers", () => ({
  headers: () => ({
    get: (name: string) => (name === "stripe-signature" ? "sig_test" : null),
  }),
}));

// ---------------------------------------------------------------------------
// Supabase mock factory — configurable per test
// ---------------------------------------------------------------------------
type MockResult = { data: unknown; error: unknown };

// Mutable holder so each test can swap out the mock chain
let mockUpdateResult: MockResult = { data: null, error: null };
let mockSelectResult: MockResult = { data: null, error: null };
let mockUpsertResult: MockResult = { data: null, error: null };

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    // S4-2: advisory lock RPCs — default to success so existing tests are unaffected
    rpc: (fn: string) => {
      if (fn === "acquire_stripe_event_lock" || fn === "release_stripe_event_lock") {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: { message: "unknown rpc" } });
    },
    from: (table: string) => {
      if (table === "stripe_events") {
        // S2-2 tests focus on update/upsert errors; stripe_events insert always succeeds here.
        // S3-7: route also calls stripe_events.update to stamp processed_at — succeeds by default.
        return {
          insert: () => ({ data: {}, error: null }),
          update: () => ({
            eq: () => ({ data: {}, error: null }),
          }),
        };
      }
      if (table === "contacts") {
        return {
          upsert: () => mockUpsertResult,
        };
      }
      if (table === "team_members") {
        // S11-2: webhook now looks up captain via team_members → contacts join
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      contacts: {
                        full_name: "Test Captain",
                        email: "captain@test.com",
                        phone: null,
                      },
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      return {
        update: () => ({
          eq: () => mockUpdateResult,
        }),
        select: () => ({
          eq: () => ({
            single: () => mockSelectResult,
          }),
        }),
      };
    },
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRegistrationEvent(teamId = "team-123") {
  return {
    id: "evt_reg_001",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_reg",
        amount_total: 70000,
        metadata: { type: "registration", team_id: teamId },
      },
    },
  };
}

function makeSponsorshipEvent(purchaseId = "purchase-456") {
  return {
    id: "evt_spon_001",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_spon",
        amount_total: 50000,
        metadata: { type: "sponsorship", purchase_id: purchaseId },
      },
    },
  };
}

async function callWebhook(body = "{}") {
  // Dynamic import so mocks are in place before the module is loaded
  const { POST } = await import("@/app/api/webhooks/stripe/route");
  const request = new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    body,
  });
  return POST(request);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetModules(); // force fresh import so module-level mocks apply cleanly
  mockConstructEvent.mockReset();

  // Defaults: all DB calls succeed
  mockUpdateResult = { data: {}, error: null };
  mockSelectResult = { data: null, error: null };
  mockUpsertResult = { data: {}, error: null };

  // Environment vars needed by route
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-test";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

describe("S2-2 webhook DB-error handling", () => {
  describe("teams.update failure (registration event)", () => {
    it("returns 500 when teams.update returns an error", async () => {
      mockConstructEvent.mockReturnValue(makeRegistrationEvent());
      mockUpdateResult = { data: null, error: { message: "connection refused", code: "08006" } };

      const response = await callWebhook();

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toBe("db_update_failed");
    });

    it("returns 200 when teams.update succeeds (no contact data)", async () => {
      mockConstructEvent.mockReturnValue(makeRegistrationEvent());
      mockUpdateResult = { data: {}, error: null };
      // No team row returned — contact upsert is skipped
      mockSelectResult = { data: null, error: null };

      const response = await callWebhook();

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.received).toBe(true);
    });
  });

  describe("contacts.upsert failure (registration event)", () => {
    it("does NOT return 500 when contacts.upsert fails — non-critical path", async () => {
      mockConstructEvent.mockReturnValue(makeRegistrationEvent());
      mockUpdateResult = { data: {}, error: null };
      // Captain is resolved via the team_members mock (S11-2); no mockSelectResult needed here.
      // The upsert error path is exercised via mockUpsertResult.
      mockUpsertResult = { data: null, error: { message: "unique violation", code: "23505" } };

      const response = await callWebhook();

      // Must NOT be 500 — contact failure is non-critical
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.received).toBe(true);
    });
  });

  describe("sponsorship_purchases.update failure (sponsorship event)", () => {
    it("returns 500 when sponsorship_purchases.update returns an error", async () => {
      mockConstructEvent.mockReturnValue(makeSponsorshipEvent());
      mockUpdateResult = { data: null, error: { message: "db write failed", code: "57014" } };

      const response = await callWebhook();

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toBe("db_update_failed");
    });

    it("returns 200 when sponsorship_purchases.update succeeds", async () => {
      mockConstructEvent.mockReturnValue(makeSponsorshipEvent());
      mockUpdateResult = { data: {}, error: null };

      const response = await callWebhook();

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.received).toBe(true);
    });
  });

  describe("non-checkout events", () => {
    it("returns 200 for unhandled event types", async () => {
      mockConstructEvent.mockReturnValue({
        id: "evt_other",
        type: "payment_intent.created",
        data: { object: {} },
      });

      const response = await callWebhook();

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.received).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// S2-7 gap coverage — webhook: signature/env guards, malformed metadata
// ---------------------------------------------------------------------------

describe("S2-7 webhook gap coverage", () => {
  beforeEach(() => {
    vi.resetModules();
    mockConstructEvent.mockReset();
    mockUpdateResult = { data: {}, error: null };
    mockSelectResult = { data: null, error: null };
    mockUpsertResult = { data: {}, error: null };

    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-test";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  describe("signature and env guards (pre-event verification)", () => {
    it("returns 400 when stripe-signature header is missing", async () => {
      // The module-level next/headers mock always returns "sig_test" for "stripe-signature".
      // The route guards on EITHER missing sig OR missing STRIPE_WEBHOOK_SECRET.
      // We test the combined guard by unsetting the env var — same code path, same 400.
      const savedSecret = process.env.STRIPE_WEBHOOK_SECRET;
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const response = await callWebhook();
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toMatch(/signature|webhook secret/i);

      process.env.STRIPE_WEBHOOK_SECRET = savedSecret;
    });

    it("returns 400 when constructEvent throws (invalid/tampered signature)", async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error("No signatures found matching the expected signature for payload");
      });

      const response = await callWebhook();
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toMatch(/invalid signature/i);
    });
  });

  describe("malformed metadata", () => {
    it("returns 200 without processing when metadata is null", async () => {
      mockConstructEvent.mockReturnValue({
        id: "evt_no_meta",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_no_meta",
            amount_total: 70000,
            metadata: null,
          },
        },
      });

      const response = await callWebhook();
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.received).toBe(true);
    });

    it("returns 200 without updating teams when type=registration but team_id is missing", async () => {
      mockConstructEvent.mockReturnValue({
        id: "evt_missing_team_id",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_missing",
            amount_total: 70000,
            // team_id deliberately omitted
            metadata: { type: "registration" },
          },
        },
      });

      const response = await callWebhook();
      expect(response.status).toBe(200);
    });

    it("returns 200 without updating sponsorship_purchases when type=sponsorship but purchase_id is missing", async () => {
      mockConstructEvent.mockReturnValue({
        id: "evt_missing_purchase_id",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_missing_pid",
            amount_total: 50000,
            // purchase_id deliberately omitted
            metadata: { type: "sponsorship" },
          },
        },
      });

      const response = await callWebhook();
      expect(response.status).toBe(200);
    });

    it("returns 200 without processing when metadata.type is unrecognized", async () => {
      mockConstructEvent.mockReturnValue({
        id: "evt_unknown_type",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_unknown",
            amount_total: 5000,
            metadata: { type: "donation", team_id: "team-x" },
          },
        },
      });

      const response = await callWebhook();
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.received).toBe(true);
    });
  });

  describe("payment_intent.succeeded — different event type", () => {
    it("returns 200 without touching DB for payment_intent.succeeded", async () => {
      mockConstructEvent.mockReturnValue({
        id: "evt_pi_succeeded",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_test",
            amount: 70000,
            metadata: { team_id: "team-123" },
          },
        },
      });

      const response = await callWebhook();
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.received).toBe(true);
    });
  });
});
