"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Error({
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
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-24 text-center">
      <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] text-[#8BB5C9] mb-3">
        Something Went Wrong
      </p>
      <h2 className="font-display text-h2 font-semibold text-foreground mb-4">
        We hit an unexpected error
      </h2>
      <p className="font-sans text-[0.9375rem] text-muted-foreground max-w-sm mb-8">
        Please try again. If the problem persists, contact the organizers.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <Button
          onClick={reset}
          className="rounded-none bg-primary px-8 text-[0.8125rem] uppercase tracking-wider text-primary-foreground hover:bg-primary/90 shadow-xs hover:shadow-sm hover:-translate-y-px transition-[background-color,box-shadow,transform] duration-150"
          size="lg"
        >
          Try Again
        </Button>
        <Link
          href="/"
          className="font-sans text-[0.875rem] text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors duration-150"
        >
          Return to Homepage
        </Link>
      </div>
    </section>
  );
}
