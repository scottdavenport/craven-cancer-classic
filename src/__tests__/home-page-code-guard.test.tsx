import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock redirect so we can observe calls without actually throwing (Next's real
// redirect throws a NEXT_REDIRECT error to halt rendering — we want to capture
// the URL argument instead).
const mockRedirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

// Mock event-settings so the happy path doesn't try to hit the DB.
vi.mock("@/lib/event-settings", () => ({
  getPublicEventSettings: vi.fn().mockResolvedValue({
    tournament_start_date: "2026-09-18",
    tournament_end_date: "2026-09-19",
    venue_name: "Test Venue",
  }),
  formatTournamentDate: () => "September 18–19, 2026",
}));

async function loadHomePage() {
  const { default: HomePage } = await import("@/app/(public)/page");
  return HomePage;
}

describe("HomePage — stray ?code= guard", () => {
  beforeEach(() => {
    mockRedirect.mockClear();
    mockRedirect.mockImplementation((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    });
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("redirects to /auth/callback when ?code= is present", async () => {
    const HomePage = await loadHomePage();
    const searchParams = Promise.resolve({ code: "abc-123" });

    await expect(HomePage({ searchParams })).rejects.toThrow(
      /NEXT_REDIRECT:\/auth\/callback\?code=abc-123&next=%2Fadmin/
    );

    expect(mockRedirect).toHaveBeenCalledTimes(1);
  });

  it("forwards a valid next param to /auth/callback", async () => {
    const HomePage = await loadHomePage();
    const searchParams = Promise.resolve({
      code: "abc-123",
      next: "/admin/contacts",
    });

    await expect(HomePage({ searchParams })).rejects.toThrow(
      /NEXT_REDIRECT:\/auth\/callback\?code=abc-123&next=%2Fadmin%2Fcontacts/
    );
  });

  it("falls back to /admin when next is absent", async () => {
    const HomePage = await loadHomePage();
    const searchParams = Promise.resolve({ code: "abc-123" });

    await expect(HomePage({ searchParams })).rejects.toThrow(
      /next=%2Fadmin$/
    );
  });

  it("does not redirect when code is an empty string", async () => {
    const HomePage = await loadHomePage();
    const searchParams = Promise.resolve({ code: "" });

    // Should render normally without calling redirect
    await HomePage({ searchParams });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("does not redirect when code param is absent", async () => {
    const HomePage = await loadHomePage();
    const searchParams = Promise.resolve({});

    await HomePage({ searchParams });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("does not redirect when called with no searchParams at all", async () => {
    const HomePage = await loadHomePage();

    await HomePage();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("URL-encodes the code value to prevent injection", async () => {
    const HomePage = await loadHomePage();
    const searchParams = Promise.resolve({ code: "abc&foo=bar" });

    await expect(HomePage({ searchParams })).rejects.toThrow(
      /code=abc%26foo%3Dbar/
    );
  });
});
