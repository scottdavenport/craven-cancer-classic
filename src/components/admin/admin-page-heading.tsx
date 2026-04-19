interface AdminPageHeadingProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function AdminPageHeading({
  title,
  description,
  children,
}: AdminPageHeadingProps) {
  return (
    <div className="border-b border-border/60 pb-6 mb-8 flex items-end justify-between gap-4">
      <div>
        <h1 className="font-sans text-2xl font-semibold text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1 font-sans text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
