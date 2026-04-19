import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/link-button";

export const metadata: Metadata = {
  title: "Registration Confirmed",
};

export default function RegistrationSuccessPage() {
  return (
    <div>
      <section className="bg-[#1A2E3A] px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-light">
            Confirmed
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">
            You&apos;re Registered!
          </h1>
          <div className="mx-auto mt-6 h-px w-16 bg-gradient-to-r from-transparent via-brand to-transparent" />
        </div>
      </section>

      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-lg text-foreground">
            Thank you for registering for the Craven Cancer Classic!
          </p>
          <p className="mt-4 text-muted-foreground">
            You will receive a confirmation email with your team details. We look
            forward to seeing you on the course.
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
