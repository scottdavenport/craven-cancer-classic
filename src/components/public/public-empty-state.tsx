import React from "react";

export interface PublicEmptyStateProps {
  title: string;
  body?: string;
  action?: React.ReactNode;
}

export function PublicEmptyState({ title, body, action }: PublicEmptyStateProps) {
  return (
    <div data-testid="public-empty-state" className="py-16 text-center">
      <h2 className="font-display text-xl font-semibold text-foreground">
        {title}
      </h2>
      {body && (
        <p className="mt-3 font-sans text-[0.9375rem] leading-[1.8] text-muted-foreground">
          {body}
        </p>
      )}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
