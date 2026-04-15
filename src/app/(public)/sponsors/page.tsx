import type { Metadata } from "next";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/link-button";

export const metadata: Metadata = {
  title: "Our Sponsors",
  description:
    "Meet the sponsors who make the Craven Cancer Classic possible.",
};

async function getSponsorsWithTiers() {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const { data: tiers } = await supabase
    .from("sponsor_tiers")
    .select("*")
    .eq("active", true)
    .order("sort_order");

  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("*")
    .eq("year", currentYear)
    .order("display_order");

  return { tiers: tiers ?? [], sponsors: sponsors ?? [] };
}

export default async function SponsorsPage() {
  const { tiers, sponsors } = await getSponsorsWithTiers();

  return (
    <div>
      {/* Header */}
      <section className="bg-[#1A2E3A] px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8BB5C9]">
            Thank You
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">
            Our Sponsors
          </h1>
          <div className="mx-auto mt-6 h-px w-16 bg-gradient-to-r from-transparent via-[#5B8FA8] to-transparent" />
          <p className="mt-6 text-base text-white/50">
            These generous organizations make the Craven Cancer Classic possible
          </p>
        </div>
      </section>

      {/* Sponsors by tier */}
      <section className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          {tiers.map((tier) => {
            const tierSponsors = sponsors.filter(
              (s) => s.tier_id === tier.id
            );

            return (
              <div key={tier.id} className="mb-16 last:mb-0">
                <div className="mb-8 text-center">
                  <h2 className="font-display text-xl font-semibold text-foreground">
                    {tier.name}
                  </h2>
                  <div className="mx-auto mt-2 h-px w-12 bg-primary/30" />
                </div>

                {tierSponsors.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-center gap-8">
                    {tierSponsors.map((sponsor) => (
                      <div key={sponsor.id} className="group">
                        {sponsor.logo_url ? (
                          <a
                            href={sponsor.website ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block transition-opacity hover:opacity-80"
                          >
                            <Image
                              src={sponsor.logo_url}
                              alt={sponsor.name}
                              width={160}
                              height={80}
                              className="h-20 w-auto object-contain"
                            />
                          </a>
                        ) : (
                          <a
                            href={sponsor.website ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-20 items-center rounded-lg border border-border px-6 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                          >
                            {sponsor.name}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground">
                    Sponsorship opportunities available
                  </p>
                )}
              </div>
            );
          })}

          {tiers.length === 0 && (
            <p className="text-center text-muted-foreground">
              Sponsor information coming soon.
            </p>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#F1F4F6] px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Become a Sponsor
          </h2>
          <p className="mt-3 text-muted-foreground">
            Join these organizations in supporting cancer patients in our
            community.
          </p>
          <div className="mt-8">
            <LinkButton
              href="/sponsorships"
              className="rounded-none bg-primary px-8 text-sm uppercase tracking-wider text-primary-foreground hover:bg-secondary"
            >
              View Sponsorship Packages
            </LinkButton>
          </div>
        </div>
      </section>
    </div>
  );
}
