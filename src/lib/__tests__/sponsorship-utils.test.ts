/**
 * sponsorship-utils.test.ts — Sprint 23 RED phase
 *
 * Tests for `slugifyItemName` pure function.
 * The function lives at src/lib/sponsorship-utils.ts — Bolt creates that
 * file in PR B (GREEN). Until then, every test here will fail with a
 * module-not-found error, which is the expected RED state.
 *
 * RED phase per craven sprint pattern (#247, #248, #249, Sprint 22 #252).
 *
 * Slug rules:
 *   - Lowercase everything
 *   - Replace spaces with hyphens
 *   - Strip non-alphanumeric characters (keep hyphens)
 *
 * Edge case decision for accented/symbolic chars:
 *   - Strip entirely (not transliterated) — "Café & Restaurant" → "caf-restaurant"
 *   - Rationale: anchor IDs must be valid URL fragments. Non-ASCII chars are
 *     technically allowed in HTML ids but cause encoding issues in CSS selectors
 *     and JS `getElementById`. Stripping is the safe choice. Bolt implements to match.
 */

import { describe, it, expect } from "vitest";
import { slugifyItemName } from "@/lib/sponsorship-utils";

describe("slugifyItemName", () => {
  it('lowercases a single word — "Champion" → "champion"', () => {
    expect(slugifyItemName("Champion")).toBe("champion");
  });

  it('lowercases a single word — "Eagle" → "eagle"', () => {
    expect(slugifyItemName("Eagle")).toBe("eagle");
  });

  it('replaces spaces with hyphens — "Golf Gift" → "golf-gift"', () => {
    expect(slugifyItemName("Golf Gift")).toBe("golf-gift");
  });

  it('handles multi-word with spaces — "Bloody Mary Bar" → "bloody-mary-bar"', () => {
    expect(slugifyItemName("Bloody Mary Bar")).toBe("bloody-mary-bar");
  });

  it('handles multi-word with prepositions — "Shot of the Day" → "shot-of-the-day"', () => {
    expect(slugifyItemName("Shot of the Day")).toBe("shot-of-the-day");
  });

  it('handles long multi-word name — "Morning Biscuit Sponsor" → "morning-biscuit-sponsor"', () => {
    expect(slugifyItemName("Morning Biscuit Sponsor")).toBe("morning-biscuit-sponsor");
  });

  it('strips non-alphanumeric characters (accents, ampersand) — "Café & Restaurant" → "caf-restaurant"', () => {
    // Non-ASCII chars (é) and symbols (&) are stripped entirely.
    // Consecutive hyphens from adjacent stripped chars are collapsed to one.
    expect(slugifyItemName("Café & Restaurant")).toBe("caf-restaurant");
  });
});
