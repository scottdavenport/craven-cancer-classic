import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Hoist the headers mock before importing the module under test.
const mockGet = vi.fn();
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: mockGet })),
}));

import { getCallbackUrl } from "@/lib/auth/callback-url";

describe("getCallbackUrl", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it("uses the origin header when present", async () => {
    mockGet.mockImplementation((key: string) =>
      key === "origin" ? "https://craven-cancer-classic.vercel.app" : null
    );

    const url = await getCallbackUrl();
    expect(url).toBe("https://craven-cancer-classic.vercel.app/auth/callback");
  });

  it("prefers origin over x-forwarded-proto / host", async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === "origin") return "https://preferred.example.com";
      if (key === "x-forwarded-proto") return "https";
      if (key === "host") return "ignored.example.com";
      return null;
    });

    const url = await getCallbackUrl();
    expect(url).toBe("https://preferred.example.com/auth/callback");
  });

  it("falls back to x-forwarded-proto + host when origin is absent", async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === "x-forwarded-proto") return "https";
      if (key === "host") return "forwarded.example.com";
      return null;
    });

    const url = await getCallbackUrl();
    expect(url).toBe("https://forwarded.example.com/auth/callback");
  });

  it("does not use x-forwarded-proto alone when host is missing", async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === "x-forwarded-proto") return "https";
      return null;
    });
    process.env.NEXT_PUBLIC_SITE_URL = "https://env-fallback.example.com";

    const url = await getCallbackUrl();
    expect(url).toBe("https://env-fallback.example.com/auth/callback");
  });

  it("falls back to NEXT_PUBLIC_SITE_URL when all headers are absent", async () => {
    mockGet.mockReturnValue(null);
    process.env.NEXT_PUBLIC_SITE_URL = "https://env-fallback.example.com";

    const url = await getCallbackUrl();
    expect(url).toBe("https://env-fallback.example.com/auth/callback");
  });

  it("always appends /auth/callback — never returns a bare origin", async () => {
    mockGet.mockImplementation((key: string) =>
      key === "origin" ? "https://example.com" : null
    );

    const url = await getCallbackUrl();
    expect(url.endsWith("/auth/callback")).toBe(true);
  });
});
