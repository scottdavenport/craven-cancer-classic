import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/link-button";
import { ProspectCaptureForm } from "@/components/public/prospect-capture-form";

export const metadata: Metadata = {
  title: "Donate",
  description:
    "Support cancer patients in our community by donating to the Craven Cancer Classic.",
};

const STATS = [
  { value: "$450K+", label: "Raised Since 2010" },
  { value: "15+", label: "Years of Impact" },
  { value: "72", label: "Teams Per Tournament" },
];

export default function DonatePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-[#1A2E3A] px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] text-brand-light">
            Make a Difference
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">
            Donate
          </h1>
          <div className="mx-auto mt-6 h-px w-16 bg-gradient-to-r from-transparent via-brand to-transparent" />
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/70">
            Every dollar raised goes to the Carolina East Health Foundation —
            covering transportation, lodging, and medical equipment for cancer
            patients in our community who are actively in treatment.
          </p>
        </div>
      </section>

      {/* Impact stats */}
      <section className="border-b border-border bg-neutral-50 px-4 py-14">
        <div className="mx-auto max-w-3xl">
          <div className="grid gap-10 sm:grid-cols-3">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="mx-auto mb-4 h-0.5 w-12 bg-primary" />
                <p className="font-display text-5xl font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission + CTA */}
      <section className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl">
          <p className="mb-3 font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] text-brand-light">
            Your Impact
          </p>
          <h2 className="font-display text-[1.75rem] font-semibold text-foreground">
            Where Your Gift Goes
          </h2>
          <div className="mt-2 h-0.5 w-12 bg-primary" />
          <p className="mt-6 text-[15px] leading-[1.8] text-muted-foreground">
            The Craven Cancer Classic has raised over $450,000 since 2010 — all
            of it directed to patients who need help getting to appointments,
            staying near treatment centers, and accessing equipment they cannot
            afford. No overhead, no administration fees. The money goes to the
            people who need it.
          </p>

          <div className="mt-10 space-y-4">
            {[
              {
                title: "Transportation",
                desc: "Helping patients get to and from treatment facilities",
              },
              {
                title: "Lodging",
                desc: "Covering accommodation costs during extended treatments",
              },
              {
                title: "Medical Equipment",
                desc: "Providing essential equipment for home care",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex gap-4 border-l-[3px] border-primary/40 pl-5"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-lg border border-border/60 bg-neutral-50 p-5 shadow-xs">
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
              className="rounded-none bg-purple px-8 text-[0.8125rem] uppercase tracking-wider text-purple-foreground hover:bg-purple-hover shadow-xs hover:shadow-sm hover:-translate-y-px transition-[background-color,box-shadow,transform] duration-150"
            >
              Donate via Carolina East Foundation
            </LinkButton>
          </div>
        </div>
      </section>

      {/* In Loving Memory */}
      <section className="border-y border-purple/20 bg-purple/5 px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl">
          <p className="mb-3 font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] text-brand-light">
            In Loving Memory
          </p>
          <h2 className="font-display text-[1.75rem] font-semibold text-foreground">
            Those We Honor
          </h2>
          <div className="mt-2 h-0.5 w-12 bg-primary" />
          <p className="mt-6 text-[15px] leading-[1.8] text-muted-foreground">
            This tournament is dedicated to the memory of{" "}
            <span className="font-display italic font-semibold text-foreground">
              Scott Davenport Sr.
            </span>
            ,{" "}
            <span className="font-display italic font-semibold text-foreground">
              Brian Fisher
            </span>
            , and{" "}
            <span className="font-display italic font-semibold text-foreground">
              John Aylward
            </span>{" "}
            — three men who valiantly fought this devastating disease. Their
            courage and spirit inspire every swing, every donation, and every
            moment of this event.
          </p>
        </div>
      </section>

      {/* Stay in Touch email capture */}
      <section className="border-t border-border/60 bg-neutral-50 px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl">
          <p className="mb-3 font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] text-brand-light">
            Stay Connected
          </p>
          <h2 className="font-display text-[1.75rem] font-semibold text-foreground">
            Stay in Touch
          </h2>
          <div className="mt-2 h-0.5 w-12 bg-primary" />
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Leave your name and email and we will let you know when registration
            opens and how to get involved — whether that means donating, playing,
            or spreading the word.
          </p>
          <div className="mt-8">
            <ProspectCaptureForm
              contactType="donor"
              notesPrefix="donor prospect — stay in touch"
              showCompany={false}
              successMessage="Thank you. We'll reach out when registration opens and keep you connected to the cause."
            />
          </div>
        </div>
      </section>
    </div>
  );
}
