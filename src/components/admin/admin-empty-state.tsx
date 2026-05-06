import * as React from "react";
import { Inbox } from "lucide-react";

interface AdminEmptyStateProps {
  title: string;
  body?: string;
  action?: React.ReactNode;
  icon?: React.ElementType;
  /**
   * When true, renders the filter-active empty state:
   *   title prop → shown as-is (consumer passes "No [entity] match your filters")
   *   action prop → shown as-is (consumer passes a "Clear filters" button)
   * When false or omitted, renders the no-data empty state:
   *   title prop → shown as-is (consumer passes "No [entity] yet")
   *   action prop → shown as-is (consumer passes an "Add [entity]" button)
   *
   * Surface-specific strings are wired by consumer in Phase 2/3 per Aria's strings.md.
   */
  filterActive?: boolean;
}

export function AdminEmptyState({
  title,
  body,
  action,
  icon: Icon,
  filterActive,
}: AdminEmptyStateProps) {
  return (
    <div className="py-12 flex flex-col items-center gap-3 text-center">
      {Icon ? (
        <Icon
          data-testid="empty-state-icon"
          className="size-8 text-muted-foreground/50"
        />
      ) : (
        <span data-testid="empty-state-inbox-default">
          <Inbox
            data-testid="empty-state-icon"
            className="size-8 text-muted-foreground/50"
          />
        </span>
      )}
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {body && (
        <p className="text-sm text-muted-foreground max-w-[280px]">{body}</p>
      )}
      {action}
    </div>
  );
}
