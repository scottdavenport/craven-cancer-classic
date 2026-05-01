/**
 * sponsors-utils.test.ts — Sprint 22 RED phase
 *
 * Tests for `getTierSize` and `formatLifetimeRaised` pure functions.
 * These functions live at src/lib/sponsors-utils.ts — Bolt creates that
 * file in PR B (GREEN). Until then, every test here will fail with a
 * module-not-found error, which is the expected RED state.
 *
 * RED phase per craven sprint pattern (#247, #248, #249).
 */

import { describe, it, expect } from "vitest";
import { getTierSize, formatLifetimeRaised } from "@/lib/sponsors-utils";

// ---------------------------------------------------------------------------
// getTierSize(priceCents: number, sponsorCount: number): "champion" | "eagle" | "standard" | "compact"
// Price bucket routing — #225
// ---------------------------------------------------------------------------

describe("getTierSize", () => {
  describe("price bucket — single-sponsor tier", () => {
    it("(500_000, 1) → 'champion' — $5,000 is champion threshold", () => {
      expect(getTierSize(500_000, 1)).toBe("champion");
    });

    it("(750_000, 1) → 'champion' — above champion threshold", () => {
      expect(getTierSize(750_000, 1)).toBe("champion");
    });

    it("(200_000, 1) → 'eagle' — $2,000 is eagle threshold", () => {
      expect(getTierSize(200_000, 1)).toBe("eagle");
    });

    it("(250_000, 1) → 'eagle' — Golf Gift ($2,500) at eagle weight", () => {
      expect(getTierSize(250_000, 1)).toBe("eagle");
    });

    it("(100_000, 1) → 'standard' — $1,000 is standard threshold", () => {
      expect(getTierSize(100_000, 1)).toBe("standard");
    });

    it("(150_000, 1) → 'standard' — Golf Carts ($1,500) at standard weight", () => {
      expect(getTierSize(150_000, 1)).toBe("standard");
    });

    it("(50_000, 1) → 'compact' — $500 is below standard threshold", () => {
      expect(getTierSize(50_000, 1)).toBe("compact");
    });

    it("(99_999, 1) → 'compact' — just below standard threshold", () => {
      expect(getTierSize(99_999, 1)).toBe("compact");
    });
  });

  describe("compact override — more than 6 sponsors", () => {
    it("(500_000, 7) → 'compact' — compact override applies to champion price", () => {
      expect(getTierSize(500_000, 7)).toBe("compact");
    });

    it("(200_000, 7) → 'compact' — compact override applies to eagle price", () => {
      expect(getTierSize(200_000, 7)).toBe("compact");
    });
  });

  describe("boundary — exactly 6 sponsors is NOT compact", () => {
    it("(500_000, 6) → 'champion' — 6 sponsors does not trigger compact", () => {
      expect(getTierSize(500_000, 6)).toBe("champion");
    });
  });
});

// ---------------------------------------------------------------------------
// formatLifetimeRaised(cents: number | null): string | null
// ---------------------------------------------------------------------------

describe("formatLifetimeRaised", () => {
  it("null → null", () => {
    expect(formatLifetimeRaised(null)).toBeNull();
  });

  it("0 → null (zero is treated as unset)", () => {
    expect(formatLifetimeRaised(0)).toBeNull();
  });

  it("58000000 ($580,000) → '$580K+'", () => {
    expect(formatLifetimeRaised(58000000)).toBe("$580K+");
  });

  it("1500000000 ($15,000,000) → '$15.0M+'", () => {
    expect(formatLifetimeRaised(1500000000)).toBe("$15.0M+");
  });

  it("50000 ($500) → '$500' — sub-1K amount formatted with no suffix", () => {
    expect(formatLifetimeRaised(50000)).toBe("$500");
  });
});
