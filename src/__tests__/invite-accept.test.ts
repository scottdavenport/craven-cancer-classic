/**
 * S3-4: GET /api/invite/accept?token=xxx
 *
 * Tests for the invite-accept route. Pins `now` so expiry checks are
 * deterministic. All tests fail until Flux builds the route.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Pin time: "now" is 2026-04-20T12:00:00Z for all tests
// ---------------------------------------------------------------------------
const FROZEN_NOW = new Date("2026-04-20T12:00:00Z");

// ---------------------------------------------------------------------------
// Mock next/headers
// ---------------------------------------------------------------------------
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Mock: Supabase service-role client
// ---------------------------------------------------------------------------
const mockInvitationSelect = vi.fn();
const mockInvitationUpdate = vi.fn();
const mockProfileUpsert = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === "invitations") {
        return {
          select: () => ({
            eq: () => ({
              single: mockInvitationSelect,
            }),
          }),
          update: mockInvitationUpdate,
        };
      }
      if (table === "profiles") {
        return {
          upsert: mockProfileUpsert,
        };
      }
      return {};
    },
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(token: string): Request {
  return new Request(`http://localhost/api/invite/accept?token=${token}`, {
    method: "GET",
  });
}

/** Builds a valid, unexpired, unaccepted invitation row */
function makeInvitation(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv-uuid-1",
    email: "invited@example.com",
    role: "viewer",
    invited_by: "admin-uuid",
    token: "valid-token-abc",
    expires_at: new Date(FROZEN_NOW.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 days
    accepted_at: null,
    created_at: FROZEN_NOW.toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.setSystemTime(FROZEN_NOW);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-test";
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

  // Defaults for happy path
  mockInvitationSelect.mockResolvedValue({
    data: makeInvitation(),
    error: null,
  });
  mockInvitationUpdate.mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
  });
  mockProfileUpsert.mockResolvedValue({ data: {}, error: null });
});

describe("S3-4 GET /api/invite/accept", () => {
  describe("valid token", () => {
    it("marks accepted_at on the invitation row", async () => {
      // @ts-ignore — module does not exist yet (red phase)
      // eslint-disable-next-line
      const { GET } = await import("@/app/api/invite/accept/route" as string);
      await GET(makeRequest("valid-token-abc"));

      expect(mockInvitationUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ accepted_at: expect.any(String) })
      );
    });

    it("upserts a profiles row with the correct role", async () => {
      // @ts-ignore — module does not exist yet (red phase)
      // eslint-disable-next-line
      const { GET } = await import("@/app/api/invite/accept/route" as string);
      await GET(makeRequest("valid-token-abc"));

      expect(mockProfileUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ role: "viewer" }),
        expect.anything()
      );
    });

    it("redirects to /admin on success", async () => {
      // @ts-ignore — module does not exist yet (red phase)
      // eslint-disable-next-line
      const { GET } = await import("@/app/api/invite/accept/route" as string);
      const response = await GET(makeRequest("valid-token-abc"));

      expect([301, 302, 307, 308]).toContain(response.status);
      const location = response.headers.get("location") ?? "";
      expect(location).toContain("/admin");
    });
  });

  describe("expired token", () => {
    it("returns 400 with 'Invite has expired' when expires_at is in the past", async () => {
      mockInvitationSelect.mockResolvedValue({
        data: makeInvitation({
          expires_at: new Date(FROZEN_NOW.getTime() - 1000).toISOString(), // 1 second ago
        }),
        error: null,
      });

      // @ts-ignore — module does not exist yet (red phase)
      // eslint-disable-next-line
      const { GET } = await import("@/app/api/invite/accept/route" as string);
      const response = await GET(makeRequest("expired-token"));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe("Invite has expired");
    });

    it("does NOT upsert a profile for an expired token", async () => {
      mockInvitationSelect.mockResolvedValue({
        data: makeInvitation({
          expires_at: new Date(FROZEN_NOW.getTime() - 3600_000).toISOString(),
        }),
        error: null,
      });

      // @ts-ignore — module does not exist yet (red phase)
      // eslint-disable-next-line
      const { GET } = await import("@/app/api/invite/accept/route" as string);
      await GET(makeRequest("expired-token"));

      expect(mockProfileUpsert).not.toHaveBeenCalled();
    });
  });

  describe("already-accepted token", () => {
    it("returns 400 with 'Invite already accepted' when accepted_at is set", async () => {
      mockInvitationSelect.mockResolvedValue({
        data: makeInvitation({
          accepted_at: new Date(FROZEN_NOW.getTime() - 86_400_000).toISOString(),
        }),
        error: null,
      });

      // @ts-ignore — module does not exist yet (red phase)
      // eslint-disable-next-line
      const { GET } = await import("@/app/api/invite/accept/route" as string);
      const response = await GET(makeRequest("used-token"));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe("Invite already accepted");
    });
  });

  describe("missing / unknown token", () => {
    it("returns 400 when token is not found in the DB", async () => {
      mockInvitationSelect.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "no rows" },
      });

      // @ts-ignore — module does not exist yet (red phase)
      // eslint-disable-next-line
      const { GET } = await import("@/app/api/invite/accept/route" as string);
      const response = await GET(makeRequest("unknown-token"));

      expect(response.status).toBe(400);
    });
  });
});
