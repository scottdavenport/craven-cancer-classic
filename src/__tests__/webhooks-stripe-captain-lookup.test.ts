/**
 * S11-2 RED phase: Stripe webhook captain lookup via team_members → contacts join.
 *
 * TARGET behavior (post-migration):
 * - Webhook resolves captain email via team_members (role='captain') → contacts join.
 * - Webhook does NOT read teams.captain_email / captain_name / captain_phone columns.
 * - When no captain row exists in team_members → no crash, logs defensively, returns 200.
 * - When captain contact has null email → skips contacts.upsert, returns 200.
 *
 * These tests FAIL today because the current webhook reads teams.captain_email directly
 * (stripe/route.ts lines 146-150) and has no team_members join path at all.
 *
 * Each test re-imports the webhook module to pick up a fresh mock via vi.resetModules().
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Static mocks (always applied)
// ---------------------------------------------------------------------------
const mockConstructEvent = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mockConstructEvent },
  }),
  Stripe: {},
}));

vi.mock("next/headers", () => ({
  headers: () => ({
    get: (name: string) => (name === "stripe-signature" ? "sig_test" : null),
  }),
}));

// ---------------------------------------------------------------------------
// Supabase mock state — shared across tests, reset in beforeEach
// ---------------------------------------------------------------------------
type MockResult = { data: unknown; error: unknown };

// Track: did any test call from('teams').select(...) with captain column names?
let teamsSelectCaptainColumnsCalled = false;
// Track: did any test call from('team_members').select(...)?
let teamMembersJoinCalled = false;
// Track: was contacts.upsert called?
let contactsUpsertCalled = false;

// Configurable captain lookup result (team_members → contacts join)
let captainJoinResult: MockResult = {
  data: {
    contacts: {
      full_name: "Jane Captain",
      email: "jane@example.com",
      phone: "555-1234",
    },
  },
  error: null,
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    rpc: (fn: string) => {
      if (fn === "acquire_stripe_event_lock" || fn === "release_stripe_event_lock") {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
    from: (table: string) => {
      if (table === "stripe_events") {
        return {
          insert: () => ({ data: {}, error: null }),
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { processed_at: null }, error: null }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ data: {}, error: null }) }),
        };
      }

      if (table === "teams") {
        return {
          update: () => ({
            eq: () => Promise.resolve({ data: {}, error: null }),
          }),
          // Track if old captain-column select path is invoked.
          // Old code: from('teams').select('captain_name, captain_email, captain_phone')...
          // New code should never call this.
          select: (columns?: string) => {
            if (
              columns &&
              (columns.includes("captain_email") ||
                columns.includes("captain_name") ||
                columns.includes("captain_phone"))
            ) {
              teamsSelectCaptainColumnsCalled = true;
            }
            // Return a valid chain so the old code path doesn't TypeError
            return {
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      captain_name: "OLD_SHOULD_NOT_USE",
                      captain_email: "old@example.com",
                      captain_phone: "555-0000",
                    },
                    error: null,
                  }),
              }),
            };
          },
        };
      }

      if (table === "team_members") {
        teamMembersJoinCalled = true;
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve(captainJoinResult),
              }),
              single: () => Promise.resolve(captainJoinResult),
            }),
          }),
        };
      }

      if (table === "contacts") {
        return {
          upsert: (payload: unknown) => {
            contactsUpsertCalled = true;
            void payload;
            return Promise.resolve({ data: null, error: null });
          },
        };
      }

      if (table === "sponsorship_purchases") {
        return {
          update: () => ({
            eq: () => Promise.resolve({ data: {}, error: null }),
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
function makeRegistrationEvent(teamId = "team-abc-001") {
  return {
    id: `evt_s11_${teamId}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_s11_test",
        amount_total: 70000,
        metadata: { type: "registration", team_id: teamId },
      },
    },
  };
}

async function callWebhook(body = "{}") {
  vi.resetModules();
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
  mockConstructEvent.mockReset();

  // Reset tracking
  teamsSelectCaptainColumnsCalled = false;
  teamMembersJoinCalled = false;
  contactsUpsertCalled = false;

  // Default: captain found via team_members join
  captainJoinResult = {
    data: {
      contacts: {
        full_name: "Jane Captain",
        email: "jane@example.com",
        phone: "555-1234",
      },
    },
    error: null,
  };

  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-test";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("S11-2 webhook: captain lookup via team_members → contacts (RED phase)", () => {
  describe("happy path: captain found via team_members join", () => {
    it("calls from('team_members').select(...) to resolve captain — NOT teams.captain_email", async () => {
      /**
       * RED: today the webhook calls from('teams').select('captain_name, captain_email, captain_phone')
       * and never touches team_members. This assertion will FAIL until Bolt rewires the webhook
       * to use the team_members → contacts join path.
       */
      mockConstructEvent.mockReturnValue(makeRegistrationEvent("team-paid-001"));

      const response = await callWebhook();

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.received).toBe(true);

      // NEW behavior: webhook must query team_members to find captain
      expect(teamMembersJoinCalled).toBe(true);

      // OLD behavior: webhook must NOT read teams.captain_email column
      // This assertion fails today because teamsSelectCaptainColumnsCalled = true
      expect(teamsSelectCaptainColumnsCalled).toBe(false);
    });

    it("contacts.upsert is called when captain contact has an email", async () => {
      mockConstructEvent.mockReturnValue(makeRegistrationEvent("team-paid-002"));

      captainJoinResult = {
        data: {
          contacts: {
            full_name: "Bob Paid",
            email: "bob@paid.com",
            phone: null,
          },
        },
        error: null,
      };

      const response = await callWebhook();

      expect(response.status).toBe(200);

      // Post-migration: contacts.upsert should be called using the email from the join
      expect(contactsUpsertCalled).toBe(true);
    });
  });

  describe("defensive: no captain row in team_members", () => {
    it("returns 200 and logs when no captain found in team_members (no crash)", async () => {
      /**
       * RED: when no captain exists in team_members, the new webhook should log and skip
       * the upsert. Today the code doesn't touch team_members at all — this test verifies
       * the absence-handling logic that Bolt must add.
       */
      mockConstructEvent.mockReturnValue(makeRegistrationEvent("team-no-captain-001"));

      // No captain row found via join
      captainJoinResult = { data: null, error: null };

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const response = await callWebhook();

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.received).toBe(true);

      // contacts.upsert must NOT be called when no captain found
      expect(contactsUpsertCalled).toBe(false);

      // Webhook MUST log a defensive warning when captain is absent
      const warnCalls = consoleWarnSpy.mock.calls.map((c: unknown[]) => c.join(" "));
      const errorCalls = consoleErrorSpy.mock.calls.map((c: unknown[]) => c.join(" "));
      const allLogs = [...warnCalls, ...errorCalls];
      const hasCaptainLog = allLogs.some(
        (msg) =>
          /captain/i.test(msg) ||
          /team_member/i.test(msg) ||
          /no captain/i.test(msg)
      );
      // This assertion locks in: the webhook MUST log when captain is absent.
      // Fails today because the old code reads teams.captain_email (not team_members).
      expect(hasCaptainLog).toBe(true);

      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it("does not call contacts.upsert when team_members has no captain row", async () => {
      mockConstructEvent.mockReturnValue(makeRegistrationEvent("team-no-captain-002"));

      captainJoinResult = { data: null, error: null };

      await callWebhook();

      // Must not upsert when captain data is unavailable
      expect(contactsUpsertCalled).toBe(false);
    });
  });

  describe("defensive: captain contact has null email", () => {
    it("skips contacts.upsert when captain contact has null email", async () => {
      /**
       * RED: when the captain's contact row has email = null, the webhook must skip
       * the upsert (can't deduplicate on null email). Today the code reads the old
       * teams.captain_email column — after migration it reads from contacts via join,
       * and must guard against null email.
       */
      mockConstructEvent.mockReturnValue(makeRegistrationEvent("team-null-email-001"));

      captainJoinResult = {
        data: {
          contacts: {
            full_name: "No Email Person",
            email: null,
            phone: null,
          },
        },
        error: null,
      };

      const response = await callWebhook();

      expect(response.status).toBe(200);

      // contacts.upsert must be skipped when email is null
      expect(contactsUpsertCalled).toBe(false);
    });

    it("returns 200 without throwing when captain contact email is null", async () => {
      mockConstructEvent.mockReturnValue(makeRegistrationEvent("team-null-email-002"));

      captainJoinResult = {
        data: {
          contacts: {
            full_name: "Null Email Captain",
            email: null,
            phone: "555-9999",
          },
        },
        error: null,
      };

      let threw = false;
      try {
        const response = await callWebhook();
        expect(response.status).toBe(200);
      } catch {
        threw = true;
      }

      expect(threw).toBe(false);
    });
  });
});
