/**
 * sponsors-utils.ts — Sprint 22
 *
 * Pure utility functions for the public /sponsors page redesign.
 * No side effects, no imports — safe to unit-test in isolation.
 */

export type TierSize = "champion" | "eagle" | "standard" | "compact";

/**
 * Maps a tier's sort_order + sponsor count to a display size bucket.
 *
 * Base mapping:
 *   sort_order = 1 → "champion"
 *   sort_order = 2 → "eagle"
 *   sort_order >= 3 → "standard"
 *
 * Compact override: any tier with sponsorCount > 6 returns "compact"
 * regardless of its sort_order.
 * Boundary: exactly 6 sponsors does NOT trigger compact.
 */
export function getTierSize(sortOrder: number, sponsorCount: number): TierSize {
  if (sponsorCount > 6) return "compact";

  if (sortOrder === 1) return "champion";
  if (sortOrder === 2) return "eagle";
  return "standard";
}

/**
 * Formats a lifetime-raised amount (in cents) for masthead display.
 *
 * - null or 0 → null (omit the stat cell entirely)
 * - >= $1,000,000 → "$X.XM+" (one decimal place)
 * - >= $1,000     → "$XK+" (rounded to nearest thousand)
 * - < $1,000      → "$X" with thousands separator
 */
export function formatLifetimeRaised(cents: number | null): string | null {
  if (cents === null || cents === 0) return null;

  const dollars = cents / 100;

  if (dollars >= 1_000_000) {
    return `$${(dollars / 1_000_000).toFixed(1)}M+`;
  }

  if (dollars >= 1_000) {
    return `$${Math.round(dollars / 1_000)}K+`;
  }

  return `$${dollars.toLocaleString()}`;
}
