/**
 * sponsorship-utils.ts — Sprint 23
 *
 * Pure utility functions for the /sponsorships Marketplace redesign.
 * No side effects, no imports — safe to unit-test in isolation.
 */

/**
 * Converts a sponsorship package name to a URL-safe anchor slug.
 * Rules:
 *   - Lowercase everything
 *   - Replace whitespace runs with a single hyphen
 *   - Strip non-alphanumeric characters (non-ASCII, symbols, punctuation)
 *   - Collapse consecutive hyphens (handles stripped symbols flanked by spaces)
 *   - Trim leading/trailing hyphens
 *
 * Examples:
 *   "Champion"                → "champion"
 *   "Golf Gift"               → "golf-gift"
 *   "Bloody Mary Bar"         → "bloody-mary-bar"
 *   "Morning Biscuit Sponsor" → "morning-biscuit-sponsor"
 *   "Shot of the Day"         → "shot-of-the-day"
 *   "Café & Restaurant"       → "caf-restaurant"
 */
export function slugifyItemName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
