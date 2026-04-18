import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import HomePage from "@/app/(public)/page";

afterEach(() => {
  cleanup();
});

describe("HomePage — hero photo", () => {
  it("renders at least one hero background image element", () => {
    render(<HomePage />);
    const imgs = screen.getAllByTestId("hero-photo");
    expect(imgs.length).toBeGreaterThan(0);
  });

  it("hero image src points to an Unsplash golf course placeholder", () => {
    render(<HomePage />);
    const imgs = screen.getAllByTestId("hero-photo");
    // Find the real img (has a non-empty src)
    const real = imgs.find((el) => (el.getAttribute("src") ?? "").length > 0);
    expect(real).toBeDefined();
    const src = real!.getAttribute("src") ?? real!.getAttribute("srcset") ?? "";
    expect(src).toMatch(/unsplash\.com/);
  });

  it("hero image has a descriptive alt text mentioning golf", () => {
    render(<HomePage />);
    const imgs = screen.getAllByTestId("hero-photo");
    const alts = imgs.map((el) => el.getAttribute("alt") ?? "");
    expect(alts.some((alt) => /golf/i.test(alt))).toBe(true);
  });

  it("renders the tournament title heading", () => {
    render(<HomePage />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings.length).toBeGreaterThan(0);
  });

  it("renders the Register Your Team CTA link", () => {
    render(<HomePage />);
    const links = screen.getAllByRole("link", { name: /register your team/i });
    expect(links.length).toBeGreaterThan(0);
  });
});
