"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SectionEyebrow } from "@/components/public/section-eyebrow";
import { CONTACT_EMAIL, CONTACT_EMAIL_MAILTO } from "@/lib/contact";

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
      <SectionEyebrow tone="light">Error</SectionEyebrow>
      <h2 className="font-display text-2xl sm:text-[1.75rem] font-semibold text-foreground mb-4">
        Something stopped working.
      </h2>
      <p className="font-sans text-[0.9375rem] text-muted-foreground max-w-sm mb-8">
        {"Try again — if it keeps happening, email "}
        <a
          href={CONTACT_EMAIL_MAILTO}
          className="underline underline-offset-4 hover:no-underline"
        >
          {CONTACT_EMAIL}
        </a>
        {"."}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <Button
          onClick={reset}
          className="bg-primary px-8 text-[0.8125rem] uppercase tracking-wider text-primary-foreground hover:bg-primary/90 shadow-xs hover:shadow-sm hover:-translate-y-px transition-[background-color,box-shadow,transform] duration-150"
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
