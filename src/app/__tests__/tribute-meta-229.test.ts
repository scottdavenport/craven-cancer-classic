/**
 * RED tests for Sprint 21 · Issue #229 — Layout metadata description
 *
 * Next 16 App Router exports metadata as a plain object — test it directly
 * via module import. No rendering needed.
 *
 * Locked string (verbatim):
 *   "Charity golf tournament since 2010. Honoring Scott Davenport Sr.,
 *    Brian Fisher, and John Aylward. For other families facing cancer."
 *
 * Plan: plans/sprint-21-229-tribute-rewrite.md
 */

import { describe, it, expect, vi } from "vitest";

// Font modules are Node-incompatible — stub next/font/google before importing layout
vi.mock("next/font/google", () => ({
  Fraunces: vi.fn().mockReturnValue({ variable: "--font-display" }),
  Manrope: vi.fn().mockReturnValue({ variable: "--font-manrope" }),
  Geist_Mono: vi.fn().mockReturnValue({ variable: "--font-geist-mono" }),
}));

// globals.css — not parseable in jsdom
vi.mock("../globals.css", () => ({}));

import { metadata } from "../layout";

describe("Layout metadata — tribute description (#229)", () => {
  it("metadata.description matches the locked string exactly", () => {
    const LOCKED =
      "Charity golf tournament since 2010. Honoring Scott Davenport Sr., Brian Fisher, and John Aylward. For other families facing cancer.";
    expect(metadata.description).toBe(LOCKED);
  });

  it("metadata.description does not contain 'valiantly fought'", () => {
    expect(String(metadata.description ?? "")).not.toContain(
      "valiantly fought"
    );
  });

  it("metadata.description contains 'since 2010'", () => {
    expect(String(metadata.description ?? "")).toContain("since 2010");
  });

  it("metadata.description contains all three honoree names", () => {
    const desc = String(metadata.description ?? "");
    expect(desc).toContain("Scott Davenport Sr.");
    expect(desc).toContain("Brian Fisher");
    expect(desc).toContain("John Aylward");
  });

  it("metadata.description contains 'For other families facing cancer'", () => {
    expect(String(metadata.description ?? "")).toContain(
      "For other families facing cancer"
    );
  });
});
