import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/link-button";
import { SectionEyebrow } from "@/components/public/section-eyebrow";

export const metadata: Metadata = {
  title: "You're In — Craven Cancer Classic",
};

export default function RegistrationSuccessPage() {
  return (
    <div>
      <section className="bg-[#1A2E3A] px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <SectionEyebrow tone="light">Confirmed</SectionEyebrow>
          <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">
            You&apos;re In.
          </h1>
          <div className="mx-auto mt-6 h-px w-16 bg-gradient-to-r from-transparent via-brand to-transparent" />
        </div>
      </section>

      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-lg text-foreground">
            Your spot in the 2026 Craven Cancer Classic is reserved.
          </p>
          <p className="mt-4 text-muted-foreground">
            Check your inbox — a confirmation with your team details is on its way. Your session will be confirmed once the committee balances groups. We&apos;ll see you in September.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <LinkButton
              href="/"
              className="bg-primary px-8 text-sm uppercase tracking-wider text-primary-foreground hover:bg-secondary"
            >
              Back to Home
            </LinkButton>
            <LinkButton
              href="/sponsors"
              variant="outline"
              className="px-8 text-sm uppercase tracking-wider"
            >
              View Sponsors
            </LinkButton>
          </div>
        </div>
      </section>
    </div>
  );
}
