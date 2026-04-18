import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/auth/callback/route";

// Mock Supabase server client
const mockExchangeCodeForSession = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
      },
    })
  ),
}));

function makeRequest(params: Record<string, string> = {}, code = "valid-code") {
  const url = new URL("https://example.com/auth/callback");
  url.searchParams.set("code", code);
  for (const [k, v] of Object.entries(params)) {
    if (v !== "") url.searchParams.set(k, v);
    else url.searchParams.set(k, "");
  }
  return new Request(url.toString());
}

beforeEach(() => {
  mockExchangeCodeForSession.mockResolvedValue({ error: null });
});

describe("GET /auth/callback — next param validation (open redirect prevention)", () => {
  it("redirects to /admin/registrations when next=/admin/registrations", async () => {
    const req = makeRequest({ next: "/admin/registrations" });
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://example.com/admin/registrations"
    );
  });

  it("redirects to /admin when next=//evil.com (open redirect attempt)", async () => {
    const req = makeRequest({ next: "//evil.com" });
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://example.com/admin");
  });

  it("redirects to /admin when next=https://evil.com (absolute URL)", async () => {
    const req = makeRequest({ next: "https://evil.com" });
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://example.com/admin");
  });

  it("redirects to /admin when next is empty string", async () => {
    const req = makeRequest({ next: "" });
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://example.com/admin");
  });

  it("redirects to /admin when next param is absent", async () => {
    const url = new URL("https://example.com/auth/callback");
    url.searchParams.set("code", "valid-code");
    const req = new Request(url.toString());
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://example.com/admin");
  });

  it("redirects to / when next=/ (root path is valid)", async () => {
    const req = makeRequest({ next: "/" });
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://example.com/");
  });

  it("redirects to /auth/login?error=auth_failed when code exchange fails", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: { message: "invalid code" },
    });
    const req = makeRequest({ next: "/admin/registrations" });
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://example.com/auth/login?error=auth_failed"
    );
  });

  it("redirects to /auth/login?error=auth_failed when no code param", async () => {
    const url = new URL("https://example.com/auth/callback");
    const req = new Request(url.toString());
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://example.com/auth/login?error=auth_failed"
    );
  });
});

// ---------------------------------------------------------------------------
// S2-7 gap coverage — auth callback: origin preservation, edge cases
// ---------------------------------------------------------------------------

describe("GET /auth/callback — S2-7 gap coverage", () => {
  beforeEach(() => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
  });

  describe("origin preservation", () => {
    it("preserves subdomain origin in redirect URL", async () => {
      const url = new URL("https://app.example.com/auth/callback");
      url.searchParams.set("code", "valid-code");
      url.searchParams.set("next", "/admin");
      const req = new Request(url.toString());
      const res = await GET(req);

      expect(res.status).toBe(307);
      // The redirect must use the subdomain origin, not a hardcoded one
      expect(res.headers.get("location")).toBe("https://app.example.com/admin");
    });

    it("uses origin from request for the error redirect too", async () => {
      mockExchangeCodeForSession.mockResolvedValue({ error: { message: "expired" } });
      const url = new URL("https://app.example.com/auth/callback");
      url.searchParams.set("code", "expired-code");
      const req = new Request(url.toString());
      const res = await GET(req);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(
        "https://app.example.com/auth/login?error=auth_failed"
      );
    });
  });

  describe("next param edge cases", () => {
    it("rejects next param with a single leading dot-dot path (not a slash)", async () => {
      // "../secret" does not start with "/" so it should fall back to /admin
      const url = new URL("https://example.com/auth/callback");
      url.searchParams.set("code", "valid-code");
      url.searchParams.set("next", "../secret");
      const req = new Request(url.toString());
      const res = await GET(req);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("https://example.com/admin");
    });

    it("accepts a deep valid path like /admin/registrations/123", async () => {
      const req = makeRequest({ next: "/admin/registrations/123" });
      const res = await GET(req);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(
        "https://example.com/admin/registrations/123"
      );
    });
  });
});
