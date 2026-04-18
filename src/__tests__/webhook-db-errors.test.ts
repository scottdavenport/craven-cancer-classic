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
    from: (table: string) => {
      if (table === "contacts") {
        return {
          upsert: () => mockUpsertResult,
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
      // Return a team so the upsert path is exercised
      mockSelectResult = {
        data: {
          captain_name: "Jane Doe",
          captain_email: "jane@example.com",
          captain_phone: "555-1234",
        },
        error: null,
      };
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
