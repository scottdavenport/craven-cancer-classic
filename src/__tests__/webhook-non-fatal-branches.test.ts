/**
 * #173 — Webhook non-fatal branch coverage
 *
 * Two defensive branches in src/app/api/webhooks/stripe/route.ts that log
 * and continue (return 200) instead of propagating the error:
 *
 *   1. Line ~111: release_stripe_event_lock RPC failure — lock is session-scoped
 *      and will be reclaimed on connection close; downstream work is already done.
 *
 *   2. Line ~210: stripe_events processed_at stamp update failure — downstream
 *      writes already succeeded; next retry will re-attempt the stamp (idempotent).
 *
 * Each test asserts:
 *   - Response is still HTTP 200
 *   - console.error was called with a non-secret message
 *   - Stripe is NOT triggered to retry (no 500 / no 4xx)
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
// Supabase mock — per-table configurable results + call tracking
// ---------------------------------------------------------------------------
type MockResult = { data: unknown; error: unknown };

// Advisory lock RPCs
let mockAcquireLockResult: MockResult = { data: true, error: null };
let mockReleaseLockResult: MockResult = { data: null, error: null };

// stripe_events table
let mockStripeEventsInsertResult: MockResult = { data: {}, error: null };
let mockStripeEventsStampResult: MockResult = { data: {}, error: null };

// teams table
let mockTeamsUpdateResult: MockResult = { data: {}, error: null };

// Call counters
let teamsUpdateCallCount = 0;
let stripeEventsStampCallCount = 0;
let releaseLockCallCount = 0;

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    rpc: (fn: string) => {
      if (fn === "acquire_stripe_event_lock") {
        return Promise.resolve(mockAcquireLockResult);
      }
      if (fn === "release_stripe_event_lock") {
        releaseLockCallCount++;
        return Promise.resolve(mockReleaseLockResult);
      }
      return Promise.resolve({ data: null, error: { message: "unknown rpc" } });
    },
    from: (table: string) => {
      if (table === "stripe_events") {
        return {
          insert: () => mockStripeEventsInsertResult,
          select: () => ({
            eq: () => ({ single: () => Promise.resolve({ data: null, error: { code: "PGRST116" } }) }),
          }),
          update: () => ({
            eq: () => {
              stripeEventsStampCallCount++;
              return mockStripeEventsStampResult;
            },
          }),
        };
      }
      if (table === "teams") {
        return {
          update: () => ({
            eq: () => {
              teamsUpdateCallCount++;
              return mockTeamsUpdateResult;
            },
          }),
        };
      }
      if (table === "team_members") {
        // S11-2: webhook resolves captain via team_members → contacts join
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
      if (table === "contacts") {
        return { upsert: () => ({ data: {}, error: null }) };
      }
      return {};
    },
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRegistrationEvent(eventId = "evt_reg_nf_001") {
  return {
    id: eventId,
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_reg",
        amount_total: 70000,
        metadata: { type: "registration", team_id: "team-123" },
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
// Setup
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.resetModules();
  mockConstructEvent.mockReset();

  // Reset call counters
  teamsUpdateCallCount = 0;
  stripeEventsStampCallCount = 0;
  releaseLockCallCount = 0;

  // Defaults: all succeed
  mockAcquireLockResult = { data: true, error: null };
  mockReleaseLockResult = { data: null, error: null };
  mockStripeEventsInsertResult = { data: {}, error: null };
  mockStripeEventsStampResult = { data: {}, error: null };
  mockTeamsUpdateResult = { data: {}, error: null };

  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-test";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

// ---------------------------------------------------------------------------
// Non-fatal branch 1: release_stripe_event_lock RPC failure
// (route.ts ~line 111 — finally block after processDownstream)
// ---------------------------------------------------------------------------
describe("non-fatal branch: release_stripe_event_lock failure", () => {
  it("returns 200 when release_stripe_event_lock RPC errors", async () => {
    mockConstructEvent.mockReturnValue(makeRegistrationEvent("evt_unlock_fail"));
    // Downstream work succeeds
    mockTeamsUpdateResult = { data: {}, error: null };
    // Release lock fails
    mockReleaseLockResult = { data: null, error: { code: "P0001", message: "unlock failed" } };

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await callWebhook();

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.received).toBe(true);

    // console.error must have been called (the defensive log)
    expect(consoleSpy).toHaveBeenCalled();
    // No secret values in the logged message — check first call args do not contain keys
    const logArgs = consoleSpy.mock.calls.find((args) =>
      String(args[0]).includes("release_stripe_event_lock")
    );
    expect(logArgs).toBeDefined();
    const logStr = logArgs!.map(String).join(" ");
    expect(logStr).not.toMatch(/service.role|whsec_|sk_/i);

    consoleSpy.mockRestore();
  });

  it("does NOT return 5xx when release lock fails — Stripe retry must not be triggered", async () => {
    mockConstructEvent.mockReturnValue(makeRegistrationEvent("evt_unlock_5xx_check"));
    mockReleaseLockResult = { data: null, error: { code: "08006", message: "connection refused" } };

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await callWebhook();

    expect(response.status).not.toBe(500);
    expect(response.status).not.toBe(502);
    expect(response.status).not.toBe(503);

    consoleSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Non-fatal branch 2: stripe_events processed_at stamp update failure
// (route.ts ~line 210 — after all downstream writes succeed)
// ---------------------------------------------------------------------------
describe("non-fatal branch: stripe_events processed_at stamp failure", () => {
  it("returns 200 when the processed_at stamp update fails after successful downstream writes", async () => {
    mockConstructEvent.mockReturnValue(makeRegistrationEvent("evt_stamp_fail"));
    // Downstream work (teams.update) succeeds
    mockTeamsUpdateResult = { data: {}, error: null };
    // processed_at stamp fails
    mockStripeEventsStampResult = { data: null, error: { code: "08006", message: "db write failed" } };

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await callWebhook();

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.received).toBe(true);

    // Downstream teams.update must have been called (work was done)
    expect(teamsUpdateCallCount).toBe(1);
    // Stamp was attempted
    expect(stripeEventsStampCallCount).toBe(1);

    // console.error must have been called for the stamp failure
    expect(consoleSpy).toHaveBeenCalled();
    const stampLogCall = consoleSpy.mock.calls.find((args) =>
      String(args[0]).includes("processed_at")
    );
    expect(stampLogCall).toBeDefined();

    consoleSpy.mockRestore();
  });

  it("does NOT return 5xx when stamp fails — Stripe retry must not be triggered", async () => {
    mockConstructEvent.mockReturnValue(makeRegistrationEvent("evt_stamp_5xx_check"));
    mockTeamsUpdateResult = { data: {}, error: null };
    mockStripeEventsStampResult = { data: null, error: { code: "PGRST002", message: "stamp error" } };

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await callWebhook();

    expect(response.status).not.toBe(500);
    expect(response.status).not.toBe(502);
    expect(response.status).not.toBe(503);

    consoleSpy.mockRestore();
  });
});
