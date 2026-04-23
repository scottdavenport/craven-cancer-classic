// STUB — Bolt implements in GREEN phase (Issue #233)
// This file exists so RED tests can import the component path.
// All tests against this file are expected to FAIL until Bolt ships the real implementation.

import React from "react";

export interface PublicEmptyStateProps {
  title: string;
  body?: string;
  action?: React.ReactNode;
}

// Stub: renders nothing meaningful — RED tests will fail on styling/structure assertions.
export function PublicEmptyState({ title, body, action }: PublicEmptyStateProps) {
  return (
    <div data-testid="public-empty-state">
      <h2>{title}</h2>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}
