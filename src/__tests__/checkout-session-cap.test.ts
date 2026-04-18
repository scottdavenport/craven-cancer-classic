/**
 * S3-9: Session-cap race — route must use register_team RPC for atomic cap check + insert.
 *
 * Tests assert the route calls supabase.rpc('register_team', ...) instead of
 * the current count-check + insert sequence.
 *
 * Tests fail today because:
 * 1. The current route does NOT call rpc('register_team')
 * 2. The "session full" error code / 400 mapping does not exist yet
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock: @/lib/stripe
// ---------------------------------------------------------------------------
const mockSessionCreate = vi.fn().mockResolvedValue({ url: "https://stripe.com/pay/cs_test" });

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
// Mock: @/lib/supabase/server — spy on rpc() call
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

const VALID_REGISTRATION_BODY = {
  team_name: "Team Alpha",
  captain_name: "Alice Smith",
  captain_email: "alice@example.com",
  session: "morning",
  players: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-test";
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

  // Happy path: rpc returns new team id
  mockRpc.mockResolvedValue({ data: { team_id: "team-uuid-new" }, error: null });

  // event_settings select (for registration_open check)
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

  mockFrom.mockImplementation((table: string) => {
    if (table === "event_settings") return mockEventSettingsChain;
    return {};
  });

  mockCreateClient.mockResolvedValue({
    from: mockFrom,
    rpc: mockRpc,
  });
});

describe("S3-9 checkout session-cap (register_team RPC)", () => {
  describe("happy path — session not full", () => {
    it("calls supabase.rpc('register_team', ...) instead of separate count + insert", async () => {
      const { POST } = await import("@/app/api/checkout/route");
      const response = await POST(makeRequest(VALID_REGISTRATION_BODY));

      // The route must have called rpc with 'register_team'
      expect(mockRpc).toHaveBeenCalledWith(
        "register_team",
        expect.objectContaining({
          p_team_name: expect.any(String),
          p_captain_email: expect.any(String),
          p_session: "morning",
        })
      );
      expect(response.status).toBe(200);
    });

    it("returns checkout URL on successful registration", async () => {
      const { POST } = await import("@/app/api/checkout/route");
      const response = await POST(makeRequest(VALID_REGISTRATION_BODY));
      const json = await response.json();

      expect(json.url).toContain("stripe.com");
    });
  });

  describe("session full — RPC returns 'session_full' error code", () => {
    it("returns 400 with 'session full' message when RPC reports cap reached", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: "SESSION_FULL", message: "session is at capacity" },
      });

      const { POST } = await import("@/app/api/checkout/route");
      const response = await POST(makeRequest(VALID_REGISTRATION_BODY));

      expect(response.status).toBe(400);
      const json = await response.json();
      // Error message must convey "session full" — accept slight wording variations
      expect(json.error.toLowerCase()).toContain("full");
    });

    it("does NOT call stripe.checkout.sessions.create when session is full", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: "SESSION_FULL", message: "session is at capacity" },
      });

      const { POST } = await import("@/app/api/checkout/route");
      await POST(makeRequest(VALID_REGISTRATION_BODY));

      expect(mockSessionCreate).not.toHaveBeenCalled();
    });
  });
});
