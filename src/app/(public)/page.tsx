import Image from "next/image";
import { LinkButton } from "@/components/ui/link-button";

// Placeholder hero photo from Unsplash (royalty-free, no attribution required).
// Wide fairway framed by pines — greens/neutrals match the teal brand palette.
// Scott: swap this URL for a real tournament photo after running seed-photos.ts.
// https://unsplash.com/license
const HERO_PHOTO_URL =
  "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=1920&q=80&fm=jpg";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#1A2E3A] px-4 py-28 sm:py-36">
        {/* Past-event background photo with dark overlay for legibility */}
        <Image
          src={HERO_PHOTO_URL}
          alt="Golf course at the Craven Cancer Classic"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
          data-testid="hero-photo"
        />
        {/* Dark overlay: enough opacity to keep copy readable */}
        <div className="absolute inset-0 bg-[#1A2E3A]/80" />

        {/* Subtle texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E")`,
          }}
        />

        <div className="relative mx-auto max-w-4xl text-center">
          <Image
            src="/logo.png"
            alt=""
            width={80}
            height={80}
            className="mx-auto mb-8 brightness-0 invert opacity-85"
            aria-hidden="true"
          />

          {/* Overline: Manrope 11px, semibold, uppercase, tracking-[0.25em], brand-light */}
          <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] text-brand-light">
            Annual Charity Golf Tournament
          </p>

          {/* h1: 3-step responsive scale — mobile / tablet / desktop */}
          <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-7xl">
            Craven Cancer
            <br />
            <span className="italic font-normal text-brand-light">Classic</span>
          </h1>

          <div className="mx-auto mt-8 h-px w-24 bg-gradient-to-r from-transparent via-brand to-transparent" />

          {/* Subhead: /60 → /70 */}
          <p className="mx-auto mt-8 max-w-lg text-base leading-relaxed text-white/70">
            Remembering those who have lost their battle, supporting those who
            continue their fight.
          </p>

          {/* Memorial line: stays /35 — intentionally recessive */}
          <p className="mt-3 text-sm text-white/35">
            Honoring Scott Davenport Sr. &middot; Brian Fisher &middot; John
            Aylward
          </p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <LinkButton
              href="/register"
              size="lg"
              className="rounded-none bg-brand px-8 text-sm uppercase tracking-wider text-white hover:bg-brand-dark"
            >
              Register Your Team
            </LinkButton>
            <LinkButton
              href="/sponsorships"
              size="lg"
              variant="outline"
              className="rounded-none border-purple/60 px-8 text-sm uppercase tracking-wider text-purple/80 hover:border-purple hover:bg-purple-muted hover:text-purple"
            >
              Become a Sponsor
            </LinkButton>
          </div>
        </div>
      </section>

      {/* Impact stats — bg-neutral-50, thin teal rule above each value */}
      <section className="border-b border-border bg-neutral-50 px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-12 sm:grid-cols-3">
            {[
              { value: "$450K+", label: "Raised Since 2010" },
              { value: "15+", label: "Years of Impact" },
              { value: "72", label: "Teams Per Tournament" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                {/* Thin teal rule above each stat */}
                <div className="w-12 h-0.5 bg-primary mx-auto mb-4" />
                <p className="font-display text-5xl font-bold text-foreground">
                  {stat.value}
                </p>
                {/* Stat label: Manrope 11px, uppercase, tracking-[0.2em] */}
                <p className="mt-2 font-sans text-[0.6875rem] uppercase tracking-[0.2em] text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
          {/* Event details tagline */}
          <p className="text-sm text-muted-foreground/60 italic mt-8 text-center">
            September 18&ndash;19, 2026 &middot; New Bern Golf &amp; Country Club
          </p>
        </div>
      </section>

      {/* Mission — generous whitespace, serif headings */}
      <section className="px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl text-center">
          {/* Section overline: Manrope 11px, semibold, uppercase, tracking-[0.25em] */}
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

        {/* Feature grid — group-hover teal rule + heading color */}
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
            <div key={item.title} className="bg-white p-10 group">
              {/* Teal rule: grows from w-8 → w-12 on hover */}
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

      {/* Donate CTA — bg-neutral-50 (warmer), purple CTAs unchanged */}
      <section className="bg-neutral-50 px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl text-center">
          {/* Section overline */}
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
              className="rounded-none bg-purple px-8 text-sm uppercase tracking-wider text-purple-foreground hover:bg-purple-hover"
            >
              Donate Now
            </LinkButton>
            <LinkButton
              href="/register"
              size="lg"
              variant="outline"
              className="rounded-none px-8 text-sm uppercase tracking-wider"
            >
              Register to Play
            </LinkButton>
          </div>
        </div>
      </section>
    </div>
  );
}
