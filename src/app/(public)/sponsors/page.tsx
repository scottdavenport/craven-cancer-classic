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
    .from("sponsorship_items")
    .select("id, name, sort_order, active")
    .eq("active", true)
    .eq("year", currentYear)
    .order("sort_order");

  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("*")
    .eq("year", currentYear)
    .eq("is_active", true)
    .is("deleted_at", null)
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
          <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] text-brand-light mb-3">
            Thank You
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">
            Our Sponsors
          </h1>
          <div className="mx-auto mt-6 h-px w-16 bg-gradient-to-r from-transparent via-brand to-transparent" />
          <p className="mt-6 text-base text-white/70">
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
                  <div className="mx-auto mt-2 h-0.5 w-12 bg-primary" />
                </div>

                {tierSponsors.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
                    {tierSponsors.map((sponsor) => (
                      <div key={sponsor.id}>
                        {sponsor.logo_url ? (
                          <a
                            href={sponsor.website ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex flex-col items-center gap-3 rounded-lg border border-border/60 bg-white shadow-xs p-6 transition-[box-shadow,transform] duration-200 hover:shadow-sm hover:-translate-y-0.5"
                          >
                            <Image
                              src={sponsor.logo_url}
                              alt={sponsor.name}
                              width={160}
                              height={80}
                              className="h-16 w-auto object-contain [filter:grayscale(1)_opacity(0.6)] transition-[filter] duration-200 group-hover:[filter:grayscale(0)_opacity(1)]"
                            />
                            <div className="text-center">
                              <p className="font-sans text-[0.75rem] text-muted-foreground leading-snug">
                                {sponsor.name}
                              </p>
                              <p className="font-sans text-[0.6875rem] italic text-muted-foreground/60 mt-0.5">
                                {tier.name}
                              </p>
                            </div>
                          </a>
                        ) : (
                          <a
                            href={sponsor.website ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border/60 bg-neutral-50 shadow-xs p-6 min-h-[7rem] transition-[box-shadow,transform] duration-200 hover:shadow-sm hover:-translate-y-0.5"
                          >
                            <span className="font-sans text-sm font-medium text-foreground text-center leading-snug">
                              {sponsor.name}
                            </span>
                            <span className="font-sans text-[0.6875rem] italic text-muted-foreground/60">
                              {tier.name}
                            </span>
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
      <section className="bg-neutral-50 border-t border-border/60 px-4 py-20">
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
              className="bg-primary px-8 text-sm uppercase tracking-wider text-primary-foreground hover:bg-secondary"
            >
              View Sponsorship Packages
            </LinkButton>
          </div>
        </div>
      </section>
    </div>
  );
}
