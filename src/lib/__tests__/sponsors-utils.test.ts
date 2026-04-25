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
// @ts-expect-error — module does not exist yet; Bolt creates it in PR B
import { getTierSize, formatLifetimeRaised } from "@/lib/sponsors-utils";

// ---------------------------------------------------------------------------
// getTierSize(sortOrder: number, sponsorCount: number): "champion" | "eagle" | "standard" | "compact"
// ---------------------------------------------------------------------------

describe("getTierSize", () => {
  describe("single-sponsor tier", () => {
    it("(1, 1) → 'champion'", () => {
      expect(getTierSize(1, 1)).toBe("champion");
    });

    it("(2, 1) → 'eagle'", () => {
      expect(getTierSize(2, 1)).toBe("eagle");
    });

    it("(3, 1) → 'standard'", () => {
      expect(getTierSize(3, 1)).toBe("standard");
    });

    it("(99, 1) → 'standard' — any sort_order > 2 falls to standard", () => {
      expect(getTierSize(99, 1)).toBe("standard");
    });
  });

  describe("compact override — more than 6 sponsors", () => {
    it("(1, 7) → 'compact' — compact override applies to champion tier", () => {
      expect(getTierSize(1, 7)).toBe("compact");
    });

    it("(2, 7) → 'compact' — compact override applies to eagle tier", () => {
      expect(getTierSize(2, 7)).toBe("compact");
    });
  });

  describe("boundary — exactly 6 sponsors is NOT compact", () => {
    it("(1, 6) → 'champion' — 6 sponsors does not trigger compact", () => {
      expect(getTierSize(1, 6)).toBe("champion");
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
