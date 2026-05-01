/**
 * sponsors-utils.ts — Sprint 22
 *
 * Pure utility functions for the public /sponsors page redesign.
 * No side effects, no imports — safe to unit-test in isolation.
 */

export type TierSize = "champion" | "eagle" | "standard" | "compact";

/**
 * Maps a tier's price_cents + sponsor count to a display size bucket.
 *
 * Price bucket mapping:
 *   price_cents >= 500_000 ($5,000+)  → "champion" (96px logo)
 *   price_cents >= 200_000 ($2,000+)  → "eagle"    (72px logo)
 *   price_cents >= 100_000 ($1,000+)  → "standard" (56px logo)
 *   price_cents <  100_000 (< $1,000) → "compact"  (48px logo)
 *
 * Compact override: any tier with sponsorCount > 6 returns "compact"
 * regardless of its price_cents.
 * Boundary: exactly 6 sponsors does NOT trigger compact.
 */
export function getTierSize(priceCents: number, sponsorCount: number): TierSize {
  if (sponsorCount > 6) return "compact";

  if (priceCents >= 500_000) return "champion";
  if (priceCents >= 200_000) return "eagle";
  if (priceCents >= 100_000) return "standard";
  return "compact";
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
