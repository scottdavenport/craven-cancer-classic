import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/link-button";
import { SponsorCard } from "@/components/public/sponsor-card";
import type { TierSize } from "@/components/public/sponsor-card";
import { SectionEyebrow } from "@/components/public/section-eyebrow";

export const metadata: Metadata = {
  title: "Our Sponsors",
  description:
    "Meet the sponsors who make the Craven Cancer Classic possible.",
};

const TIER_SIZE_MAP: Record<number, TierSize> = {
  1: "champion",
  2: "eagle",
  3: "standard",
  4: "compact",
};

const TIER_GRID_MAP: Record<TierSize, string> = {
  champion: "grid grid-cols-1 gap-6 sm:grid-cols-2",
  eagle: "grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3",
  standard: "flex justify-center",
  compact: "grid grid-cols-2 gap-3 sm:grid-cols-4",
};

const TIER_HEADING_CLASS: Record<TierSize, string> = {
  champion: "font-display text-3xl font-semibold text-foreground",
  eagle: "font-display text-2xl font-semibold text-foreground",
  standard: "font-display text-xl font-semibold text-foreground",
  compact: "font-display text-lg font-semibold text-foreground",
};

const TIER_RULE_CLASS: Record<TierSize, string> = {
  champion: "w-full",
  eagle: "w-16",
  standard: "w-10",
  compact: "w-8",
};

async function getSponsorsWithTiers() {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const { data: tiers } = await supabase
    .from("sponsorship_items")
    .select("id, name, sort_order, active")
    .eq("active", true)
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
    <div data-testid="sponsors-page">
      <section
        data-testid="sponsors-header"
        className="bg-cream grain-overlay px-4 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-3xl text-center">
          <SectionEyebrow tone="brand">In Gratitude</SectionEyebrow>
          <h1 className="mt-4 font-display text-4xl font-bold text-foreground sm:text-5xl">
            Our Sponsors
          </h1>
          <div className="mx-auto mt-6 h-px w-16 bg-brand" />
          <p className="mt-6 text-base text-foreground/70">
            These generous organizations make the Craven Cancer Classic possible
          </p>
        </div>
      </section>

      <section className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          {tiers.map((tier) => {
            const tierSponsors = sponsors.filter((s) => s.tier_id === tier.id);
            const tierSize: TierSize = TIER_SIZE_MAP[tier.sort_order] ?? "standard";
            const gridClass = TIER_GRID_MAP[tierSize];
            const headingClass = TIER_HEADING_CLASS[tierSize];

            return (
              <div
                key={tier.id}
                data-testid={`tier-section-${tier.id}`}
                className="mb-16 last:mb-0"
              >
                <div className="mb-8 text-center">
                  <h3
                    data-testid={`tier-heading-${tier.id}`}
                    className={headingClass}
                  >
                    {tier.name}
                  </h3>
                  <div className={`mx-auto mt-2 h-0.5 ${TIER_RULE_CLASS[tierSize]} bg-brand`} />
                </div>

                {tierSponsors.length > 0 ? (
                  <div className={gridClass}>
                    {tierSponsors.map((sponsor) => (
                      <SponsorCard
                        key={sponsor.id}
                        sponsor={sponsor}
                        tierSize={tierSize}
                      />
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

      <section
        data-testid="sponsors-cta"
        className="bg-[#1A2E3A] grain-overlay px-4 py-20"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl font-semibold text-white">
            Make It Possible
            <br />
            For Someone Fighting Right Now.
          </h2>
          <p className="mt-3 text-white/70">
            Your sponsorship funds transportation to treatment, lodging during
            extended care, and medical equipment for patients in our community
            facing the hardest days of their lives.
          </p>
          <div className="mt-8">
            <LinkButton
              data-testid="sponsors-cta-button"
              href="/sponsorships"
              className="w-full sm:w-auto bg-brand px-8 text-sm uppercase tracking-wider text-white hover:bg-brand/90"
            >
              View Sponsorship Packages
            </LinkButton>
          </div>
        </div>
      </section>
    </div>
  );
}
