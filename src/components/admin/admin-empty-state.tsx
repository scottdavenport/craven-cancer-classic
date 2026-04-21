import { Inbox } from "lucide-react";

interface AdminEmptyStateProps {
  title: string;
  body?: string;
  action?: React.ReactNode;
  icon?: React.ElementType;
}

export function AdminEmptyState({
  title,
  body,
  action,
  icon: Icon,
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
