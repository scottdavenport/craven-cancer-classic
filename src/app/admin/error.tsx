"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CONTACT_EMAIL, CONTACT_EMAIL_MAILTO } from "@/lib/contact";

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
        Something stopped working.
      </h2>
      <p className="font-sans text-[0.875rem] text-muted-foreground">
        {"Try again — if it keeps happening, email "}
        <a
          href={CONTACT_EMAIL_MAILTO}
          className="underline underline-offset-4 hover:no-underline"
        >
          {CONTACT_EMAIL}
        </a>
        {"."}
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
