/**
 * S3-4: POST /api/invite
 *
 * Behavioral contract tests for the invite route handler.
 * Implementation does not exist yet — all tests fail with module-not-found
 * or assertion failures until Flux builds the route.
 *
 * Key mocks:
 * - Supabase admin client: `auth.admin.inviteUserByEmail()` + `from("invitations")`
 * - next/headers: returns a session cookie so auth check can run
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock: next/headers — cookies for session hydration
// ---------------------------------------------------------------------------
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
  headers: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue(null),
  }),
}));

// ---------------------------------------------------------------------------
// Mock: Supabase admin client (service-role)
// ---------------------------------------------------------------------------
const mockInviteUserByEmail = vi.fn();
const mockInvitationsInsert = vi.fn();
const mockInvitationsSelect = vi.fn();

// Admin client: used inside the route to check caller role + send invite
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetAdminCaller,
      admin: {
        inviteUserByEmail: mockInviteUserByEmail,
      },
    },
    from: (table: string) => {
      if (table === "invitations") {
        return {
          insert: mockInvitationsInsert,
          select: mockInvitationsSelect,
        };
      }
      return {};
    },
  }),
}));

// ---------------------------------------------------------------------------
// Mock: server supabase client — used to verify the caller is admin
// ---------------------------------------------------------------------------
const mockGetAdminCaller = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: mockGetAdminCaller,
    },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: mockProfileSelect,
            }),
          }),
        };
      }
      return {};
    },
  }),
}));

const mockProfileSelect = vi.fn();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(body: Record<string, unknown>, authHeader?: string): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }
  return new Request("http://localhost/api/invite", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

const ADMIN_USER = { id: "admin-uid", email: "admin@example.com" };
const VALID_BODY = { email: "new@example.com", role: "viewer" };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-test";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test";
});

describe("S3-4 POST /api/invite", () => {
  describe("admin auth required — 403 for non-admin", () => {
    it("returns 403 when caller is not authenticated", async () => {
      mockGetAdminCaller.mockResolvedValue({ data: { user: null }, error: null });

      // @ts-ignore — module does not exist yet (red phase)
      const { POST } = await import("@/app/api/invite/route" as string);
      const response = await POST(makeRequest(VALID_BODY));

      expect(response.status).toBe(403);
    });

    it("returns 403 when caller is authenticated but role is not admin", async () => {
      mockGetAdminCaller.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
      mockProfileSelect.mockResolvedValue({
        data: { role: "user" },
        error: null,
      });

      // @ts-ignore — module does not exist yet (red phase)
      const { POST } = await import("@/app/api/invite/route" as string);
      const response = await POST(makeRequest(VALID_BODY));

      expect(response.status).toBe(403);
    });
  });

  describe("409 on duplicate pending invite", () => {
    it("returns 409 with correct message when unexpired invite already exists for email", async () => {
      mockGetAdminCaller.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
      mockProfileSelect.mockResolvedValue({ data: { role: "admin" }, error: null });

      // Simulate duplicate key violation from invitations insert
      mockInvitationsInsert.mockResolvedValue({
        data: null,
        error: { code: "23505", message: "duplicate key" },
      });

      // @ts-ignore — module does not exist yet (red phase)
      const { POST } = await import("@/app/api/invite/route" as string);
      const response = await POST(makeRequest(VALID_BODY));

      expect(response.status).toBe(409);
      const json = await response.json();
      expect(json.error).toBe("Invite already pending for this email");
    });
  });

  describe("200 success path", () => {
    it("inserts invitation row and calls auth.admin.inviteUserByEmail", async () => {
      mockGetAdminCaller.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
      mockProfileSelect.mockResolvedValue({ data: { role: "admin" }, error: null });
      mockInvitationsInsert.mockResolvedValue({
        data: { id: "inv-uuid-1", token: "tok123" },
        error: null,
      });
      mockInviteUserByEmail.mockResolvedValue({ data: {}, error: null });

      // @ts-ignore — module does not exist yet (red phase)
      const { POST } = await import("@/app/api/invite/route" as string);
      const response = await POST(makeRequest(VALID_BODY));

      expect(response.status).toBe(200);
      // Must have called inviteUserByEmail with the invited email
      expect(mockInviteUserByEmail).toHaveBeenCalledWith(
        "new@example.com",
        expect.objectContaining({
          data: expect.objectContaining({ role: "viewer" }),
        })
      );
    });

    it("returns 200 with success acknowledgement", async () => {
      mockGetAdminCaller.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
      mockProfileSelect.mockResolvedValue({ data: { role: "admin" }, error: null });
      mockInvitationsInsert.mockResolvedValue({
        data: { id: "inv-uuid-2", token: "tok456" },
        error: null,
      });
      mockInviteUserByEmail.mockResolvedValue({ data: {}, error: null });

      // @ts-ignore — module does not exist yet (red phase)
      const { POST } = await import("@/app/api/invite/route" as string);
      const response = await POST(makeRequest(VALID_BODY));
      const json = await response.json();

      // Must include some acknowledgement field
      expect(json).toHaveProperty("success");
    });
  });
});
