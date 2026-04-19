import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/link-button";

export const metadata: Metadata = {
  title: "About Our Cause",
  description:
    "Learn about the Craven Cancer Classic and our mission to support cancer patients in the community.",
};

export default function AboutPage() {
  return (
    <div>
      {/* Header */}
      <section className="bg-[#1A2E3A] px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-light">
            Our Story
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">
            About Our Cause
          </h1>
          <div className="mx-auto mt-6 h-px w-16 bg-gradient-to-r from-transparent via-brand to-transparent" />
          <p className="mt-6 text-base text-white/50">
            A community united against cancer since 2010
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl">
          <article className="space-y-16">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">
                Our Story
              </h2>
              <div className="mt-1 h-px w-12 bg-primary/40" />
              <p className="mt-6 text-[15px] leading-[1.8] text-muted-foreground">
                The Craven Cancer Classic was founded in 2010 to honor those who
                have valiantly fought cancer and to support those who continue
                their battle. What started as a community gathering has grown
                into one of the premier charity golf events in eastern North
                Carolina.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">
                In Loving Memory
              </h2>
              <div className="mt-1 h-px w-12 bg-primary/40" />
              <p className="mt-6 text-[15px] leading-[1.8] text-muted-foreground">
                This tournament is dedicated to the memory of{" "}
                <strong className="font-semibold text-foreground">
                  Scott Davenport Sr.
                </strong>
                ,{" "}
                <strong className="font-semibold text-foreground">
                  Brian Fisher
                </strong>
                , and{" "}
                <strong className="font-semibold text-foreground">
                  John Aylward
                </strong>{" "}
                — three men who valiantly fought this devastating disease. Their
                courage and spirit inspire every swing, every donation, and every
                moment of this event.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">
                Where the Money Goes
              </h2>
              <div className="mt-1 h-px w-12 bg-primary/40" />
              <p className="mt-6 text-[15px] leading-[1.8] text-muted-foreground">
                Every dollar raised through the Craven Cancer Classic goes
                directly to the Carolina East Health Foundation to support cancer
                patients in our community.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  {
                    title: "Transportation",
                    desc: "Helping patients get to and from treatment facilities",
                  },
                  {
                    title: "Medical Equipment",
                    desc: "Providing essential equipment for home care",
                  },
                  {
                    title: "Lodging",
                    desc: "Covering accommodation costs during extended treatments",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex gap-4 border-l-2 border-primary/30 pl-5"
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
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">
                Our Impact
              </h2>
              <div className="mt-1 h-px w-12 bg-primary/40" />
              <p className="mt-6 text-[15px] leading-[1.8] text-muted-foreground">
                Since 2010, the Craven Cancer Classic has raised over{" "}
                <strong className="font-semibold text-foreground">
                  $450,000
                </strong>{" "}
                for cancer patients in the Craven County area. The tournament has
                grown from a single session to morning and afternoon shotgun
                starts, welcoming over 70 teams each year to the New Bern Golf
                &amp; Country Club.
              </p>
            </div>

            {/* Quote block */}
            <div className="border-y border-border py-12 text-center">
              <p className="font-display text-xl font-medium italic text-foreground leading-relaxed">
                &ldquo;Remembering those who valiantly fought cancer,
                <br />
                supporting those who continue their fight.&rdquo;
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <LinkButton
                  href="/donate"
                  className="bg-primary px-8 text-sm uppercase tracking-wider text-primary-foreground hover:bg-secondary"
                >
                  Donate Now
                </LinkButton>
                <LinkButton
                  href="/register"
                  variant="outline"
                  className="px-8 text-sm uppercase tracking-wider"
                >
                  Register to Play
                </LinkButton>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
