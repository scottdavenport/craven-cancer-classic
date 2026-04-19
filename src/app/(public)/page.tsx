import Image from "next/image";
import { LinkButton } from "@/components/ui/link-button";
import {
  getPublicEventSettings,
  formatTournamentDate,
} from "@/lib/event-settings";

// Placeholder hero photo from Unsplash (royalty-free, no attribution required).
// Wide fairway framed by pines — greens/neutrals match the teal brand palette.
// Scott: swap this URL for a real tournament photo after running seed-photos.ts.
// https://unsplash.com/license
const HERO_PHOTO_URL =
  "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=1920&q=80&fm=jpg";

export default async function HomePage() {
  const settings = await getPublicEventSettings();

  const dateString = formatTournamentDate(
    settings?.tournament_start_date ?? null,
    settings?.tournament_end_date ?? null
  );
  const venueString = settings?.venue_name ?? "Venue TBD";

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="grain-overlay relative overflow-hidden bg-[#1A2E3A] px-4 py-14 sm:py-20">
        {/* Background photo */}
        <Image
          src={HERO_PHOTO_URL}
          alt="Golf course at the Craven Cancer Classic"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
          data-testid="hero-photo"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-[#1A2E3A]/80" />

        <div className="relative z-10 mx-auto max-w-6xl">
          {/* Asymmetric 3-col grid on desktop; stacked on mobile */}
          <div className="lg:grid lg:grid-cols-3 lg:items-end lg:gap-12">

            {/* ── Left: logo + headline (cols 1–2) ── */}
            <div className="lg:col-span-2">
              {/* Overline */}
              <p
                className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] text-brand-light opacity-0 animate-[fadeUp_400ms_ease-out_forwards]"
                style={{ animationDelay: "0ms" }}
              >
                Annual Charity Golf Tournament
              </p>

              {/* Full SVG logo — IS the wordmark */}
              <div
                className="mt-6 opacity-0 animate-[fadeUp_400ms_ease-out_forwards]"
                style={{ animationDelay: "0ms" }}
              >
                <Image
                  src="/brand/ccc-logo-full.svg"
                  alt="Craven Cancer Classic"
                  width={400}
                  height={143}
                  priority
                  className="mx-auto brightness-0 invert opacity-95 lg:mx-0"
                />
              </div>

              {/* SEO h1 — visually hidden, logo is the visual wordmark */}
              <h1 className="sr-only">Craven Cancer Classic</h1>

              {/* Divider */}
              <div className="mt-8 mx-auto lg:mx-0 h-px w-24 bg-gradient-to-r from-transparent via-brand to-transparent" />

              {/* Subhead */}
              <p
                className="mt-8 max-w-lg text-base leading-relaxed text-white/70 mx-auto lg:mx-0 text-center lg:text-left opacity-0 animate-[fadeUp_400ms_ease-out_forwards]"
                style={{ animationDelay: "200ms" }}
              >
                Remembering those who have lost their battle, supporting those
                who continue their fight.
              </p>

              {/* Memorial line */}
              <p
                className="mt-3 text-sm text-white/35 text-center lg:text-left opacity-0 animate-[fadeUp_400ms_ease-out_forwards]"
                style={{ animationDelay: "300ms" }}
              >
                Honoring Scott Davenport Sr. &middot; Brian Fisher &middot;
                John Aylward
              </p>

              {/* CTAs */}
              <div
                className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-4 opacity-0 animate-[fadeUp_400ms_ease-out_forwards]"
                style={{ animationDelay: "400ms" }}
              >
                <LinkButton
                  href="/register"
                  size="lg"
                  className="bg-brand px-8 text-sm uppercase tracking-wider text-white hover:bg-brand-dark"
                >
                  Register Your Team
                </LinkButton>
                <LinkButton
                  href="/sponsorships"
                  size="lg"
                  variant="outline"
                  className="border-purple/60 px-8 text-sm uppercase tracking-wider text-purple/80 hover:border-purple hover:bg-purple-muted hover:text-purple"
                >
                  Become a Sponsor
                </LinkButton>
              </div>
            </div>

            {/* ── Right: date/venue sidecar (col 3) ── */}
            <div
              className="mt-12 lg:mt-0 border-brand/40 lg:border-l-2 lg:pl-6 text-center lg:text-left opacity-0 animate-[fadeUp_400ms_ease-out_forwards]"
              style={{ animationDelay: "100ms" }}
            >
              {/* Mobile: horizontal rule instead of left border */}
              <div className="mb-6 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent lg:hidden" />

              <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] text-brand-light mb-3">
                Tournament Date
              </p>
              <p className="font-display text-xl font-semibold text-white leading-snug">
                {dateString}
              </p>

              <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] text-brand-light mt-6 mb-3">
                Venue
              </p>
              <p className="font-display text-xl font-semibold text-white leading-snug">
                {venueString}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Impact stats ─────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-neutral-50 px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-12 sm:grid-cols-3">
            {[
              { value: "$450K+", label: "Raised Since 2010" },
              { value: "15+", label: "Years of Impact" },
              { value: "72", label: "Teams Per Tournament" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="w-12 h-0.5 bg-primary mx-auto mb-4" />
                <p className="font-display text-5xl font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="mt-2 font-sans text-[0.6875rem] uppercase tracking-[0.2em] text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission — cream background ───────────────────────────────────── */}
      <section className="bg-cream px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] text-primary mb-3">
            Our Mission
          </p>
          <h2 className="font-display text-3xl sm:text-[1.75rem] font-semibold text-foreground mt-0 mb-6">
            Making a Difference in
            <br />
            Our Community
          </h2>
          <p className="font-sans text-[0.9375rem] leading-[1.65] text-muted-foreground max-w-xl mx-auto">
            Every dollar raised goes directly to supporting cancer patients
            through the Carolina East Health Foundation — providing financial
            assistance for transportation, medical equipment, and lodging during
            treatment.
          </p>
        </div>

        {/* Feature grid */}
        <div className="mx-auto mt-20 grid max-w-4xl gap-px bg-border sm:grid-cols-2">
          {[
            {
              title: "Support Patients",
              description:
                "Funds help cover travel, lodging, and equipment for those in treatment.",
            },
            {
              title: "Play Golf",
              description:
                "Morning and afternoon shotgun starts at New Bern Golf & Country Club.",
            },
            {
              title: "Build Community",
              description:
                "Connect with sponsors, players, and supporters who share our mission.",
            },
            {
              title: "Share Memories",
              description:
                "Upload photos during the tournament and relive the best moments.",
            },
          ].map((item) => (
            <div key={item.title} className="bg-cream p-10 group">
              <div className="w-8 h-0.5 bg-primary mb-4 transition-all duration-200 group-hover:w-12" />
              <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-150">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Donate CTA — white ───────────────────────────────────────────── */}
      <section className="bg-white px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] text-primary mb-3">
            Get Involved
          </p>
          <h2 className="font-display text-3xl sm:text-[1.75rem] font-semibold text-foreground mt-0 mb-6">
            Every Contribution
            <br />
            Makes an Impact
          </h2>
          <p className="font-sans text-[0.9375rem] leading-[1.65] text-muted-foreground max-w-xl mx-auto">
            Whether you play, sponsor, or donate — you help cancer patients in
            our community.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <LinkButton
              href="/donate"
              size="lg"
              className="bg-purple px-8 text-sm uppercase tracking-wider text-purple-foreground hover:bg-purple-hover"
            >
              Donate Now
            </LinkButton>
            <LinkButton
              href="/register"
              size="lg"
              variant="outline"
              className="px-8 text-sm uppercase tracking-wider"
            >
              Register to Play
            </LinkButton>
          </div>
        </div>
      </section>
    </div>
  );
}
