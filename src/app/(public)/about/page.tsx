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
      <section className="bg-primary px-4 py-16 text-primary-foreground sm:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            About Our Cause
          </h1>
          <p className="mt-4 text-lg text-primary-foreground/80">
            A community united against cancer
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-primary">Our Story</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              The Craven Cancer Classic was founded in 2010 to honor those who
              have valiantly fought cancer and to support those who continue
              their battle. What started as a community gathering has grown into
              one of the premier charity golf events in eastern North Carolina.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-primary">
              In Loving Memory
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              This tournament is dedicated to the memory of{" "}
              <strong className="text-foreground">Scott Davenport Sr.</strong>,{" "}
              <strong className="text-foreground">Brian Fisher</strong>, and{" "}
              <strong className="text-foreground">John Aylward</strong> — three
              men who valiantly fought this devastating disease. Their courage
              and spirit inspire every swing, every donation, and every moment of
              this event.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-primary">Where the Money Goes</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Every dollar raised through the Craven Cancer Classic goes directly
              to the Carolina East Health Foundation to support cancer patients
              in our community. Funds provide:
            </p>
            <ul className="mt-4 space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary" />
                <span>
                  <strong className="text-foreground">Transportation</strong> —
                  helping patients get to and from treatment facilities
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary" />
                <span>
                  <strong className="text-foreground">Medical Equipment</strong>{" "}
                  — providing essential equipment for home care
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary" />
                <span>
                  <strong className="text-foreground">Lodging</strong> —
                  covering accommodation costs during extended treatments
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-primary">Our Impact</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Since 2010, the Craven Cancer Classic has raised over{" "}
              <strong className="text-foreground">$450,000</strong> for cancer
              patients in the Craven County area. The tournament has grown from a
              single session to morning and afternoon shotgun starts, welcoming
              over 70 teams each year to the New Bern Golf &amp; Country Club.
            </p>
          </div>

          <div className="rounded-xl bg-muted p-8 text-center">
            <p className="text-lg font-semibold text-primary">
              &ldquo;Remembering those who have lost their battle, supporting
              those who continue their fight.&rdquo;
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <LinkButton href="/donate">Donate Now</LinkButton>
              <LinkButton href="/register" variant="outline">
                Register to Play
              </LinkButton>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
