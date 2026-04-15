import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/link-button";
import { Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "Donate",
  description:
    "Support cancer patients in our community by donating to the Craven Cancer Classic.",
};

export default function DonatePage() {
  return (
    <div>
      <section className="bg-[#1A2E3A] px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8BB5C9]">
            Make a Difference
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">
            Donate
          </h1>
          <div className="mx-auto mt-6 h-px w-16 bg-gradient-to-r from-transparent via-[#5B8FA8] to-transparent" />
        </div>
      </section>

      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-lg text-center">
          <Heart className="mx-auto h-12 w-12 text-primary/40" />
          <h2 className="mt-6 font-display text-2xl font-semibold text-foreground">
            Support Cancer Patients
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            All donations go directly to the Carolina East Health Foundation to
            support cancer patients in our community with transportation, medical
            equipment, and lodging during treatment.
          </p>
          <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              When donating, please designate your gift to:
            </p>
            <p className="mt-1 font-semibold text-foreground">
              Craven Cancer Classic Golf Tournament
            </p>
          </div>
          <div className="mt-8">
            <LinkButton
              href="https://www.carolinaeasthealth.com/foundation/donate-now/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-none bg-primary px-8 text-sm uppercase tracking-wider text-primary-foreground hover:bg-secondary"
            >
              Donate via Carolina East Foundation
            </LinkButton>
          </div>
        </div>
      </section>
    </div>
  );
}
