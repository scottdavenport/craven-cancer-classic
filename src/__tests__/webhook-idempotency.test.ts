/**
 * Regression tests for S2-3: webhook idempotency via stripe_events dedupe table
 *
 * Verifies:
 * - First delivery of an event id processes DB updates normally (200)
 * - Second delivery of the same event id short-circuits with 200, no DB updates
 * - A non-duplicate insert error on stripe_events returns 500 (Stripe retries)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock @/lib/stripe
// ---------------------------------------------------------------------------
const mockConstructEvent = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mockConstructEvent },
  }),
  Stripe: {},
}));

// ---------------------------------------------------------------------------
// Mock next/headers
// ---------------------------------------------------------------------------
vi.mock("next/headers", () => ({
  headers: () => ({
    get: (name: string) => (name === "stripe-signature" ? "sig_test" : null),
  }),
}));

// ---------------------------------------------------------------------------
// Supabase mock — tracks per-table call counts and returns configurable results
// ---------------------------------------------------------------------------
type MockResult = { data: unknown; error: unknown };

let mockInsertResult: MockResult = { data: {}, error: null };
let mockUpdateResult: MockResult = { data: {}, error: null };
let mockSelectResult: MockResult = { data: null, error: null };
let mockUpsertResult: MockResult = { data: {}, error: null };

// S3-7: result for the processed_at check (SELECT after 23505)
let mockProcessedAtSelectResult: MockResult = { data: null, error: null };

// Spy counters — reset in beforeEach
let stripeEventsInsertCallCount = 0;
let stripeEventsUpdateCallCount = 0; // S3-7: tracks processed_at stamp
let teamsUpdateCallCount = 0;
let sponsorshipPurchasesUpdateCallCount = 0;

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === "stripe_events") {
        return {
          insert: () => {
            stripeEventsInsertCallCount++;
            return mockInsertResult;
          },
          // S3-7: route selects the existing row after 23505 to check processed_at
          select: () => ({
            eq: () => ({
              single: () => mockProcessedAtSelectResult,
            }),
          }),
          // S3-7: route stamps processed_at after all downstream writes succeed
          update: () => ({
            eq: () => {
              stripeEventsUpdateCallCount++;
              return mockUpdateResult;
            },
          }),
        };
      }
      if (table === "contacts") {
        return {
          upsert: () => mockUpsertResult,
        };
      }
      if (table === "teams") {
        return {
          update: () => ({
            eq: () => {
              teamsUpdateCallCount++;
              return mockUpdateResult;
            },
          }),
          select: () => ({
            eq: () => ({
              single: () => mockSelectResult,
            }),
          }),
        };
      }
      if (table === "sponsorship_purchases") {
        return {
          update: () => ({
            eq: () => {
              sponsorshipPurchasesUpdateCallCount++;
              return mockUpdateResult;
            },
          }),
        };
      }
      return {};
    },
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRegistrationEvent(eventId = "evt_reg_001", teamId = "team-123") {
  return {
    id: eventId,
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

function makeSponsorshipEvent(eventId = "evt_spon_001", purchaseId = "purchase-456") {
  return {
    id: eventId,
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
  vi.resetModules();
  mockConstructEvent.mockReset();

  // Reset counters
  stripeEventsInsertCallCount = 0;
  stripeEventsUpdateCallCount = 0;
  teamsUpdateCallCount = 0;
  sponsorshipPurchasesUpdateCallCount = 0;

  // Defaults: all DB calls succeed
  mockInsertResult = { data: {}, error: null };
  mockUpdateResult = { data: {}, error: null };
  mockSelectResult = { data: null, error: null };
  mockUpsertResult = { data: {}, error: null };
  // S3-7: default — no existing row found (first delivery)
  mockProcessedAtSelectResult = { data: null, error: { code: "PGRST116" } };

  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-test";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

describe("S2-3 webhook idempotency", () => {
  describe("first delivery — event id not yet seen", () => {
    it("inserts into stripe_events and processes the registration event (200)", async () => {
      mockConstructEvent.mockReturnValue(makeRegistrationEvent());
      mockInsertResult = { data: {}, error: null };
      mockUpdateResult = { data: {}, error: null };

      const response = await callWebhook();

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.received).toBe(true);
      expect(stripeEventsInsertCallCount).toBe(1);
      expect(teamsUpdateCallCount).toBe(1);
    });

    it("inserts into stripe_events and processes the sponsorship event (200)", async () => {
      mockConstructEvent.mockReturnValue(makeSponsorshipEvent());
      mockInsertResult = { data: {}, error: null };
      mockUpdateResult = { data: {}, error: null };

      const response = await callWebhook();

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.received).toBe(true);
      expect(stripeEventsInsertCallCount).toBe(1);
      expect(sponsorshipPurchasesUpdateCallCount).toBe(1);
    });
  });

  describe("duplicate delivery — event id already in stripe_events", () => {
    it("short-circuits with 200 and does NOT update teams on duplicate registration event", async () => {
      mockConstructEvent.mockReturnValue(makeRegistrationEvent("evt_dup_reg"));
      // Duplicate key violation — PostgreSQL code 23505
      mockInsertResult = { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };

      const response = await callWebhook();

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.received).toBe(true);
      // Must NOT have called teams.update
      expect(teamsUpdateCallCount).toBe(0);
    });

    it("short-circuits with 200 and does NOT update sponsorship_purchases on duplicate sponsorship event", async () => {
      mockConstructEvent.mockReturnValue(makeSponsorshipEvent("evt_dup_spon"));
      mockInsertResult = { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };

      const response = await callWebhook();

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.received).toBe(true);
      // Must NOT have called sponsorship_purchases.update
      expect(sponsorshipPurchasesUpdateCallCount).toBe(0);
    });
  });

  describe("stripe_events insert fails with unexpected error", () => {
    it("returns 500 so Stripe retries", async () => {
      mockConstructEvent.mockReturnValue(makeRegistrationEvent("evt_err_001"));
      mockInsertResult = { data: null, error: { code: "08006", message: "connection refused" } };

      const response = await callWebhook();

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toBe("db_insert_failed");
      // teams.update must NOT have been called — we bailed early
      expect(teamsUpdateCallCount).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// S3-7: processed_at idempotency fix
// ---------------------------------------------------------------------------
describe("S3-7 webhook processed_at stamp", () => {
  describe("first successful delivery", () => {
    it("stamps processed_at on stripe_events after all downstream writes succeed", async () => {
      mockConstructEvent.mockReturnValue(makeRegistrationEvent("evt_s37_001"));
      mockInsertResult = { data: {}, error: null };
      mockUpdateResult = { data: {}, error: null };

      const response = await callWebhook();

      expect(response.status).toBe(200);
      // Route must have called stripe_events.update to stamp processed_at
      expect(stripeEventsUpdateCallCount).toBe(1);
    });

    it("does NOT stamp processed_at when downstream teams.update fails", async () => {
      mockConstructEvent.mockReturnValue(makeRegistrationEvent("evt_s37_002"));
      mockInsertResult = { data: {}, error: null };
      // teams.update fails
      mockUpdateResult = { data: null, error: { code: "PGRST001", message: "update failed" } };

      const response = await callWebhook();

      expect(response.status).toBe(500);
      // processed_at must NOT be stamped — leave NULL so retry re-runs
      expect(stripeEventsUpdateCallCount).toBe(0);
    });
  });

  describe("duplicate delivery — processed_at IS NOT NULL (fully processed)", () => {
    it("short-circuits with 200 and skips all downstream work", async () => {
      mockConstructEvent.mockReturnValue(makeRegistrationEvent("evt_s37_dup_done"));
      // Insert returns 23505 — event already in stripe_events
      mockInsertResult = { data: null, error: { code: "23505", message: "duplicate key" } };
      // Row already has processed_at set — fully processed
      mockProcessedAtSelectResult = {
        data: { id: "evt_s37_dup_done", processed_at: "2026-04-20T10:00:00Z" },
        error: null,
      };

      const response = await callWebhook();

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.received).toBe(true);
      // No downstream work — teams.update must not be called
      expect(teamsUpdateCallCount).toBe(0);
      // No processed_at stamp — already done
      expect(stripeEventsUpdateCallCount).toBe(0);
    });
  });

  describe("duplicate delivery — processed_at IS NULL (partial failure retry)", () => {
    it("re-runs downstream writes when prior attempt left processed_at NULL", async () => {
      mockConstructEvent.mockReturnValue(makeRegistrationEvent("evt_s37_partial", "team-456"));
      // Insert returns 23505 — event already in stripe_events
      mockInsertResult = { data: null, error: { code: "23505", message: "duplicate key" } };
      // Row exists but processed_at IS NULL — prior attempt failed midway
      mockProcessedAtSelectResult = {
        data: { id: "evt_s37_partial", processed_at: null },
        error: null,
      };
      // Downstream writes succeed this time
      mockUpdateResult = { data: {}, error: null };

      const response = await callWebhook();

      expect(response.status).toBe(200);
      // Must have re-run teams.update
      expect(teamsUpdateCallCount).toBe(1);
      // And must stamp processed_at after success
      expect(stripeEventsUpdateCallCount).toBe(1);
    });
  });
});
