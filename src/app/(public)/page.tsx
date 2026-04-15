import Image from "next/image";
import { LinkButton } from "@/components/ui/link-button";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#1A2E3A] px-4 py-28 sm:py-36">
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />

        <div className="relative mx-auto max-w-4xl text-center">
          <Image
            src="/logo.png"
            alt=""
            width={80}
            height={80}
            className="mx-auto mb-8 brightness-0 invert opacity-60"
            aria-hidden="true"
          />

          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8BB5C9]">
            Annual Charity Golf Tournament
          </p>

          <h1 className="mt-5 font-display text-5xl font-bold tracking-tight text-white sm:text-7xl">
            Craven Cancer
            <br />
            <span className="italic font-normal text-[#8BB5C9]">Classic</span>
          </h1>

          <div className="mx-auto mt-8 h-px w-24 bg-gradient-to-r from-transparent via-[#5B8FA8] to-transparent" />

          <p className="mx-auto mt-8 max-w-lg text-base leading-relaxed text-white/60">
            Remembering those who have lost their battle, supporting those who
            continue their fight.
          </p>

          <p className="mt-3 text-sm text-white/35">
            Honoring Scott Davenport Sr. &middot; Brian Fisher &middot; John
            Aylward
          </p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <LinkButton
              href="/register"
              size="lg"
              className="rounded-none bg-[#5B8FA8] px-8 text-sm uppercase tracking-wider text-white hover:bg-[#4A7E97]"
            >
              Register Your Team
            </LinkButton>
            <LinkButton
              href="/sponsorships"
              size="lg"
              variant="outline"
              className="rounded-none border-white/20 px-8 text-sm uppercase tracking-wider text-white/70 hover:border-white/40 hover:bg-white/5 hover:text-white"
            >
              Become a Sponsor
            </LinkButton>
          </div>
        </div>
      </section>

      {/* Impact stats — understated, editorial */}
      <section className="border-b border-border bg-white px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-12 sm:grid-cols-3">
            {[
              { value: "$450K+", label: "Raised Since 2010" },
              { value: "15+", label: "Years of Impact" },
              { value: "72", label: "Teams Per Tournament" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
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

      {/* Mission — generous whitespace, serif headings */}
      <section className="px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Our Mission
          </p>
          <h2 className="mt-4 font-display text-3xl font-semibold text-foreground sm:text-4xl">
            Making a Difference in
            <br />
            Our Community
          </h2>
          <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-muted-foreground">
            Every dollar raised goes directly to supporting cancer patients
            through the Carolina East Health Foundation — providing financial
            assistance for transportation, medical equipment, and lodging during
            treatment.
          </p>
        </div>

        {/* Features — clean grid, no cards, just typography */}
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
            <div
              key={item.title}
              className="bg-white p-10 group"
            >
              <h3 className="font-display text-lg font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Donate CTA — subtle, refined */}
      <section className="bg-[#F1F4F6] px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Get Involved
          </p>
          <h2 className="mt-4 font-display text-3xl font-semibold text-foreground sm:text-4xl">
            Every Contribution
            <br />
            Makes an Impact
          </h2>
          <p className="mx-auto mt-6 max-w-md text-muted-foreground">
            Whether you play, sponsor, or donate — you help cancer patients in
            our community.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <LinkButton
              href="/donate"
              size="lg"
              className="rounded-none bg-primary px-8 text-sm uppercase tracking-wider text-primary-foreground hover:bg-secondary"
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
