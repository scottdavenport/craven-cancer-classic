/**
 * stripe-webhook-tribute.test.ts — Sprint 33 RED phase
 *
 * Pins the contract for the Stripe webhook re: tribute_recipient:
 * 1. The webhook does NOT re-set tribute_recipient on sponsorship_purchases.
 *    tribute_recipient is set at purchase INSERT (pre-Stripe); the webhook
 *    only stamps payment_status/stripe_payment_id/amount_paid_cents.
 * 2. Duplicate event short-circuit (idempotency) still works for tribute
 *    purchase events.
 * 3. A tribute purchase event with tribute_recipient in metadata processes
 *    correctly and returns 200.
 *
 * RED reason: The current webhook update payload shape does not yet need to
 * exclude tribute_recipient (it never set it). The RED state for tests 3-4
 * is that the webhook will need to handle metadata.tribute_recipient on a
 * sponsorship event — currently it doesn't read this field at all, so the
 * test asserting update payload shape exclusion needs the Phase 2 contract.
 * Tests that assert the update call shape currently pass structurally but
 * will pin the contract going forward.
 *
 * Note: Tests 1-2 may already pass against current webhook code (idempotency
 * is implemented). The RED tests that will fail are the ones that verify the
 * tribute metadata path through the webhook and that update payloads never
 * include tribute_recipient.
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
// Supabase mock — tracks update payloads to verify tribute_recipient exclusion
// ---------------------------------------------------------------------------
type MockResult = { data: unknown; error: unknown };

let mockInsertResult: MockResult = { data: {}, error: null };
let mockUpdateResult: MockResult = { data: {}, error: null };
let mockProcessedAtSelectResult: MockResult = { data: null, error: { code: "PGRST116" } };
let mockLockResult: MockResult = { data: true, error: null };

// Capture the last update payload for sponsorship_purchases
let lastSponsorshipUpdatePayload: Record<string, unknown> | null = null;

let stripeEventsInsertCallCount = 0;
let stripeEventsUpdateCallCount = 0;
let sponsorshipPurchasesUpdateCallCount = 0;
let sponsorshipPurchasesSelectCallCount = 0;
let advisoryLockCallCount = 0;
let releaseLockCallCount = 0;

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    rpc: (fn: string) => {
      if (fn === "acquire_stripe_event_lock") {
        advisoryLockCallCount++;
        return Promise.resolve(mockLockResult);
      }
      if (fn === "release_stripe_event_lock") {
        releaseLockCallCount++;
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: { message: "unknown rpc" } });
    },
    from: (table: string) => {
      if (table === "stripe_events") {
        return {
          insert: () => {
            stripeEventsInsertCallCount++;
            return mockInsertResult;
          },
          select: () => ({
            eq: () => ({
              single: () => mockProcessedAtSelectResult,
            }),
          }),
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
          upsert: () => ({ data: { id: "contact-uuid" }, error: null }),
        };
      }
      if (table === "teams") {
        return {
          update: () => ({
            eq: () => mockUpdateResult,
          }),
          select: () => ({
            eq: () => ({
              single: () => ({ data: null, error: null }),
            }),
          }),
        };
      }
      if (table === "sponsorship_purchases") {
        return {
          update: (payload: Record<string, unknown>) => {
            lastSponsorshipUpdatePayload = { ...payload };
            sponsorshipPurchasesUpdateCallCount++;
            return {
              eq: () => mockUpdateResult,
            };
          },
          select: () => {
            sponsorshipPurchasesSelectCallCount++;
            return {
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: "purchase-1", tribute_recipient: "John Davenport" },
                    error: null,
                  }),
              }),
            };
          },
        };
      }
      if (table === "team_members") {
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
      return {};
    },
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSponsorshipEvent(
  eventId = "evt_spon_tribute_001",
  purchaseId = "purchase-tribute-1",
  extraMetadata: Record<string, string> = {}
) {
  return {
    id: eventId,
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_test_${eventId}`,
        amount_total: 2000,
        metadata: {
          type: "sponsorship",
          purchase_id: purchaseId,
          ...extraMetadata,
        },
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

  stripeEventsInsertCallCount = 0;
  stripeEventsUpdateCallCount = 0;
  sponsorshipPurchasesUpdateCallCount = 0;
  sponsorshipPurchasesSelectCallCount = 0;
  advisoryLockCallCount = 0;
  releaseLockCallCount = 0;
  lastSponsorshipUpdatePayload = null;

  mockInsertResult = { data: {}, error: null };
  mockUpdateResult = { data: {}, error: null };
  mockProcessedAtSelectResult = { data: null, error: { code: "PGRST116" } };
  mockLockResult = { data: true, error: null };

  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-test";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

describe("Sprint 33 — webhook tribute_recipient handling", () => {
  describe("tribute purchase event processes successfully", () => {
    it("returns 200 when sponsorship event includes tribute_recipient in metadata", async () => {
      mockConstructEvent.mockReturnValue(
        makeSponsorshipEvent("evt_tribute_ok", "purchase-trib-1", {
          tribute_recipient: "John Davenport",
        })
      );

      const response = await callWebhook();
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.received).toBe(true);
    });

    it("updates sponsorship_purchases payment status for tribute events", async () => {
      mockConstructEvent.mockReturnValue(
        makeSponsorshipEvent("evt_tribute_update", "purchase-trib-2", {
          tribute_recipient: "Mary Smith",
        })
      );

      await callWebhook();
      expect(sponsorshipPurchasesUpdateCallCount).toBe(1);
    });
  });

  describe("webhook does NOT re-set tribute_recipient on sponsorship_purchases", () => {
    it("update payload for sponsorship_purchases does not include tribute_recipient", async () => {
      mockConstructEvent.mockReturnValue(
        makeSponsorshipEvent("evt_no_rewrite", "purchase-trib-3", {
          tribute_recipient: "John Davenport",
        })
      );

      await callWebhook();

      // The webhook's update payload must NOT include tribute_recipient
      // (it was set at INSERT time by the checkout route)
      expect(lastSponsorshipUpdatePayload).not.toBeNull();
      expect(lastSponsorshipUpdatePayload).not.toHaveProperty("tribute_recipient");
    });

    it("update payload for sponsorship_purchases only stamps payment_status, stripe_payment_id, and amount_paid_cents", async () => {
      mockConstructEvent.mockReturnValue(
        makeSponsorshipEvent("evt_payload_shape", "purchase-trib-4", {
          tribute_recipient: "Some Honoree",
        })
      );

      await callWebhook();

      expect(lastSponsorshipUpdatePayload).not.toBeNull();
      // Must have the payment fields
      expect(lastSponsorshipUpdatePayload).toHaveProperty("payment_status", "paid");
      expect(lastSponsorshipUpdatePayload).toHaveProperty("stripe_payment_id");
      expect(lastSponsorshipUpdatePayload).toHaveProperty("amount_paid_cents");
      // Must NOT have tribute_recipient
      expect(lastSponsorshipUpdatePayload).not.toHaveProperty("tribute_recipient");
    });

    it("update payload also does not include tribute_recipient when metadata omits it (normal sponsorship)", async () => {
      mockConstructEvent.mockReturnValue(
        makeSponsorshipEvent("evt_normal_spon", "purchase-norm-1")
        // no tribute_recipient in metadata
      );

      await callWebhook();

      expect(lastSponsorshipUpdatePayload).not.toBeNull();
      expect(lastSponsorshipUpdatePayload).not.toHaveProperty("tribute_recipient");
    });
  });

  describe("idempotency — duplicate events still short-circuit for tribute purchases", () => {
    it("duplicate delivery of tribute event short-circuits with 200 (no second DB update)", async () => {
      mockConstructEvent.mockReturnValue(
        makeSponsorshipEvent("evt_tribute_dup", "purchase-trib-dup", {
          tribute_recipient: "John Davenport",
        })
      );
      // Simulate duplicate key violation
      mockInsertResult = {
        data: null,
        error: { code: "23505", message: "duplicate key value violates unique constraint" },
      };
      // Already fully processed
      mockProcessedAtSelectResult = {
        data: { id: "evt_tribute_dup", processed_at: "2026-05-01T10:00:00Z" },
        error: null,
      };

      const response = await callWebhook();

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.received).toBe(true);
      // Must NOT have called sponsorship_purchases.update on duplicate
      expect(sponsorshipPurchasesUpdateCallCount).toBe(0);
    });

    it("tribute purchase retry (processed_at IS NULL) re-runs update without tribute_recipient", async () => {
      mockConstructEvent.mockReturnValue(
        makeSponsorshipEvent("evt_tribute_retry", "purchase-trib-retry", {
          tribute_recipient: "Jane Smith",
        })
      );
      // Duplicate but processed_at is null (prior attempt failed)
      mockInsertResult = {
        data: null,
        error: { code: "23505", message: "duplicate key" },
      };
      mockProcessedAtSelectResult = {
        data: { id: "evt_tribute_retry", processed_at: null },
        error: null,
      };
      mockUpdateResult = { data: {}, error: null };

      await callWebhook();

      // Re-ran the downstream update
      expect(sponsorshipPurchasesUpdateCallCount).toBe(1);
      // But tribute_recipient must still not be in the update payload
      expect(lastSponsorshipUpdatePayload).not.toHaveProperty("tribute_recipient");
    });
  });
});
