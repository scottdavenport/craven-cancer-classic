import React from "react";

/**
 * STUB — src/components/public/sponsor-card.tsx
 *
 * This file is a minimal stub created by Spec to allow RED tests to compile and
 * run. It exports the SponsorCard type signature only; it does NOT implement
 * any behaviour. Every test that asserts rendered output will fail.
 *
 * Bolt replaces this entire file with the real implementation (#220).
 * Do NOT ship this stub to production.
 */

export type TierSize = "champion" | "eagle" | "standard" | "compact";

export interface SponsorCardProps {
  sponsor: {
    id: string;
    name: string;
    logo_url: string | null;
    website: string | null;
  };
  tierSize: TierSize;
}

// Stub component — renders nothing. All tests asserting rendered content will fail (RED).
export function SponsorCard(_props: SponsorCardProps): React.ReactElement {
  return <></>;
}
