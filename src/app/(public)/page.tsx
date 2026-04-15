import { LinkButton } from "@/components/ui/link-button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Trophy, Users, Camera } from "lucide-react";

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-primary px-4 py-24 text-primary-foreground sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-secondary">
            Annual Charity Golf Tournament
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
            Craven Cancer Classic
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-foreground/80">
            Remembering those who have lost their battle, supporting those who
            continue their fight.
          </p>
          <p className="mt-2 text-primary-foreground/60">
            Honoring Scott Davenport Sr., Brian Fisher &amp; John Aylward
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <LinkButton
              href="/register"
              size="lg"
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              Register Your Team
            </LinkButton>
            <LinkButton
              href="/sponsorships"
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            >
              Become a Sponsor
            </LinkButton>
            <LinkButton
              href="/donate"
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            >
              Donate
            </LinkButton>
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="border-b border-border/40 bg-white px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">$450K+</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Raised Since 2010
              </p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">15+</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Years of Impact
              </p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">72</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Teams Per Tournament
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About the Cause */}
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-primary">
            Making a Difference
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Every dollar raised goes directly to supporting cancer patients in
            our community through the Carolina East Health Foundation — providing
            financial assistance for transportation, medical equipment, and
            lodging during treatment.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Heart,
              title: "Support Patients",
              description:
                "Funds help cover travel, lodging, and equipment for those in treatment.",
            },
            {
              icon: Trophy,
              title: "Play Golf",
              description:
                "Morning and afternoon shotgun starts at New Bern Golf & Country Club.",
            },
            {
              icon: Users,
              title: "Build Community",
              description:
                "Connect with sponsors, players, and supporters who share our mission.",
            },
            {
              icon: Camera,
              title: "Share Memories",
              description:
                "Upload photos during the tournament and relive the best moments.",
            },
          ].map((item) => (
            <Card key={item.title}>
              <CardContent className="pt-6 text-center">
                <item.icon className="mx-auto h-10 w-10 text-secondary" />
                <h3 className="mt-4 font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-primary">
            Ready to Make an Impact?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Whether you play, sponsor, or donate — every contribution helps
            cancer patients in our community.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <LinkButton href="/register" size="lg">
              Register Now
            </LinkButton>
            <LinkButton href="/sponsorships" size="lg" variant="outline">
              View Sponsorships
            </LinkButton>
          </div>
        </div>
      </section>
    </div>
  );
}
