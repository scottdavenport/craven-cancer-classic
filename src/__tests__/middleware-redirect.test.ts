/**
 * S3-6: Middleware must NOT set `redirectTo` search param on unauthenticated
 * redirects to /auth/login.
 *
 * The test fails today because middleware.ts:45 calls
 * `url.searchParams.set("redirectTo", request.nextUrl.pathname)`.
 *
 * After S3-6, the redirectTo line is deleted — the URL must be clean.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mock @supabase/ssr — simulate unauthenticated user (getUser returns null)
// ---------------------------------------------------------------------------
const mockGetUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
});

async function callMiddleware(pathname: string) {
  // Re-import each time so module-level env reads are fresh
  vi.resetModules();
  vi.mock("@supabase/ssr", () => ({
    createServerClient: () => ({
      auth: {
        getUser: mockGetUser,
      },
    }),
  }));

  const { updateSession } = await import("@/lib/supabase/middleware");
  const url = `http://localhost${pathname}`;
  const request = new NextRequest(url, { method: "GET" });
  return updateSession(request);
}

describe("S3-6 middleware redirect — no redirectTo param", () => {
  describe("unauthenticated request to /admin", () => {
    it("redirects to /auth/login", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const response = await callMiddleware("/admin");

      expect(response.status).toBe(307);
      const location = response.headers.get("location") ?? "";
      expect(location).toContain("/auth/login");
    });

    it("does NOT include a redirectTo searchParam in the redirect URL", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const response = await callMiddleware("/admin/scores");

      const location = response.headers.get("location") ?? "";
      const redirectUrl = new URL(location, "http://localhost");
      expect(redirectUrl.searchParams.has("redirectTo")).toBe(false);
    });

    it("does NOT include any searchParams on the login redirect URL", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const response = await callMiddleware("/admin/registrations");

      const location = response.headers.get("location") ?? "";
      const redirectUrl = new URL(location, "http://localhost");
      expect(redirectUrl.search).toBe("");
    });
  });

  describe("authenticated request to /admin", () => {
    it("passes through without redirect", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "admin@example.com" } },
        error: null,
      });

      const response = await callMiddleware("/admin");

      // NextResponse.next() yields a 200, not a redirect
      expect(response.status).not.toBe(307);
      expect(response.status).not.toBe(302);
    });
  });
});
