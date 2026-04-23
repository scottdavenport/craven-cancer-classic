// STUB — Bolt implements in GREEN phase (Issue #233)
// This file exists so RED tests can import the component path.
// All tests against this file are expected to FAIL until Bolt ships the real implementation.

import React from "react";

export type EyebrowTone = "light" | "primary" | "brand";

export interface SectionEyebrowProps {
  tone?: EyebrowTone;
  className?: string;
  children: React.ReactNode;
}

// Stub: renders nothing meaningful — RED tests will fail on styling/tone assertions.
export function SectionEyebrow({ children, className }: SectionEyebrowProps) {
  return (
    <p data-testid="section-eyebrow" className={className}>
      {children}
    </p>
  );
}
