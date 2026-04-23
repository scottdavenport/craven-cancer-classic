// STUB — Bolt implements in GREEN phase (Issue #233)
// This file exists so RED tests can import the component path.
// All tests against this file are expected to FAIL until Bolt ships the real implementation.

import React from "react";

export interface InfoCalloutProps {
  children: React.ReactNode;
  className?: string;
}

// Stub: renders nothing meaningful — RED tests will fail on styling assertions.
export function InfoCallout({ children, className }: InfoCalloutProps) {
  return (
    <div data-testid="info-callout" className={className}>
      {children}
    </div>
  );
}
