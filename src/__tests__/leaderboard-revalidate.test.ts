/**
 * S3-2: Leaderboard page must export `revalidate = 300` (5-minute ISR).
 *
 * This test reads the compiled module export so the constant is visible
 * without executing RSC-specific code paths. The test fails until Bolt
 * adds `export const revalidate = 300` to leaderboard/page.tsx.
 */

import { describe, it, expect } from "vitest";

// We import the module to check its named exports.
// The page itself is an async server component and we won't render it —
// we only need to confirm the export exists with the correct value.

describe("S3-2 leaderboard revalidate export", () => {
  it("exports revalidate = 300", async () => {
    // Dynamically import so we can inspect named exports without rendering.
    const mod = await import("@/app/(public)/leaderboard/page");
    // @ts-expect-error — revalidate is not yet typed on the module
    expect(mod.revalidate).toBe(300);
  });
});
