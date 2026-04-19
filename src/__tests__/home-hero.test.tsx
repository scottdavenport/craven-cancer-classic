import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

// Mock the event-settings module so the async server component resolves without a DB call.
vi.mock("@/lib/event-settings", () => ({
  getPublicEventSettings: vi.fn().mockResolvedValue({
    tournament_start_date: "2026-09-18",
    tournament_end_date: "2026-09-19",
    venue_name: "New Bern Golf & Country Club",
  }),
  formatTournamentDate: (start: string | null, end: string | null) => {
    if (!start) return "Date TBD";
    return "September 18–19, 2026";
  },
}));

afterEach(() => {
  cleanup();
});

async function renderHomePage() {
  const { default: HomePage } = await import("@/app/(public)/page");
  // Resolve the async server component to a React element.
  const element = await (HomePage as () => Promise<React.ReactElement>)();
  render(element);
}

describe("HomePage — hero photo", () => {
  it("renders at least one hero background image element", async () => {
    await renderHomePage();
    const imgs = screen.getAllByTestId("hero-photo");
    expect(imgs.length).toBeGreaterThan(0);
  });

  it("hero image src points to an Unsplash golf course placeholder", async () => {
    await renderHomePage();
    const imgs = screen.getAllByTestId("hero-photo");
    const real = imgs.find((el) => (el.getAttribute("src") ?? "").length > 0);
    expect(real).toBeDefined();
    const src = real!.getAttribute("src") ?? real!.getAttribute("srcset") ?? "";
    expect(src).toMatch(/unsplash\.com/);
  });

  it("hero image has a descriptive alt text mentioning golf", async () => {
    await renderHomePage();
    const imgs = screen.getAllByTestId("hero-photo");
    const alts = imgs.map((el) => el.getAttribute("alt") ?? "");
    expect(alts.some((alt) => /golf/i.test(alt))).toBe(true);
  });

  it("renders the tournament title heading (sr-only h1)", async () => {
    await renderHomePage();
    const headings = screen.getAllByRole("heading", { level: 1, hidden: true });
    expect(headings.length).toBeGreaterThan(0);
  });

  it("renders the Register Your Team CTA link", async () => {
    await renderHomePage();
    const links = screen.getAllByRole("link", { name: /register your team/i });
    expect(links.length).toBeGreaterThan(0);
  });
});
