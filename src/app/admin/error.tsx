"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="font-sans text-[1.25rem] font-semibold text-foreground">
        Something went wrong
      </h2>
      <p className="font-sans text-[0.875rem] text-muted-foreground">
        An unexpected error occurred.
      </p>
      {error.digest && (
        <code className="font-mono text-xs text-muted-foreground/60">
          {error.digest}
        </code>
      )}
      <Button variant="default" size="sm" onClick={reset}>
        Try Again
      </Button>
    </div>
  );
}
