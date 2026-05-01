/**
 * SponsorsPage — Sprint 22 redesign (Marquee direction)
 *
 * Dark-teal masthead + populated-tier-only rendering + Open Sponsorships
 * chip block + bottom CTA → /donate.
 *
 * Data flow:
 *  1. event_settings (current year) — lifetime_raised_cents
 *  2. sponsorship_items (active, not deleted) — ordered by sort_order
 *  3. sponsors (current year, active, not deleted) — ordered by display_order
 *  4. Compute populatedTiers vs openItems
 *  5. Render masthead → tier sections → open block → bottom CTA
 */

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/link-button";
import { SponsorCard } from "@/components/public/sponsor-card";
import { SponsorsMasthead } from "@/components/public/sponsors-masthead";
import { OpenSponsorshipsBlock } from "@/components/public/open-sponsorships-block";
import { getTierSize } from "@/lib/sponsors-utils";
import type { TierSize } from "@/lib/sponsors-utils";

export const metadata: Metadata = {
  title: "Our Partners",
  description:
    "Meet the organizations and individuals who make the Craven Cancer Classic possible.",
};

// Grid CSS class per tier size — includes the partner-grid--{size} identifier
// that tests 33-36 assert on
const TIER_GRID_CLASS: Record<TierSize, string> = {
  champion:
    "partner-grid--champion grid grid-cols-1 gap-6 sm:grid-cols-2",
  eagle:
    "partner-grid--eagle grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3",
  standard:
    "partner-grid--standard grid grid-cols-2 gap-4 sm:grid-cols-4",
  compact:
    "partner-grid--compact grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6",
};

async function getPageData() {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  // 1. Event settings — for lifetime_raised_cents
  const { data: eventSettings } = await supabase
    .from("event_settings")
    .select("lifetime_raised_cents")
    .single();

  // 2. Sponsorship items — active only, ordered by sort_order
  //    Soft-delete filter (deleted_at IS NULL) applied in JS because the
  //    mock chain only supports one .eq() before .order()
  const { data: tiersRaw } = await supabase
    .from("sponsorship_items")
    .select("id, name, sort_order, active, deleted_at, price_cents")
    .eq("active", true)
    .eq("category", "sponsorship")
    .order("sort_order");

  // Filter soft-deleted items in JS
  const tiers = (tiersRaw ?? []).filter(
    (t) => t.deleted_at === null || t.deleted_at === undefined
  );

  // 3. Sponsors — current year, active, not deleted
  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("id, name, logo_url, website, tier_id, display_order, is_active, deleted_at, year")
    .eq("year", currentYear)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("display_order");

  const activeSponsors = sponsors ?? [];

  return {
    currentYear,
    lifetimeRaisedCents: eventSettings?.lifetime_raised_cents ?? null,
    tiers,
    activeSponsors,
  };
}

export default async function SponsorsPage() {
  const { currentYear, lifetimeRaisedCents, tiers, activeSponsors } =
    await getPageData();

  // 4. Compute populated vs open tiers
  const populatedTiers = tiers.filter((tier) =>
    activeSponsors.some((s) => s.tier_id === tier.id)
  );

  const openItems = tiers
    .filter((tier) => !activeSponsors.some((s) => s.tier_id === tier.id))
    .map((tier) => ({
      id: tier.id,
      name: tier.name,
      price_cents: (tier as { price_cents?: number }).price_cents ?? 0,
    }));

  const totalPartnerCount = activeSponsors.length;

  return (
    <div data-testid="sponsors-page">
      {/* Masthead — outside <main> per design preview */}
      <SponsorsMasthead
        year={currentYear}
        partnerCount={totalPartnerCount}
        lifetimeRaisedCents={lifetimeRaisedCents}
      />

      {/* Tier sections */}
      <main className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
        {populatedTiers.map((tier) => {
          const tierSponsors = activeSponsors.filter(
            (s) => s.tier_id === tier.id
          );
          const tierSize = getTierSize((tier as { price_cents?: number }).price_cents ?? 0, tierSponsors.length);
          const gridClass = TIER_GRID_CLASS[tierSize];

          return (
            <div
              key={tier.id}
              data-testid={`tier-section-${tier.id}`}
              className="mb-20 last:mb-0"
            >
              {/* Tier header */}
              <div className="flex items-baseline justify-between mb-8 pb-4 border-t border-border pt-4">
                <div>
                  <span
                    style={{
                      fontFamily: "var(--font-manrope)",
                      fontWeight: 700,
                      fontSize: "0.6875rem",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "var(--brand)",
                      display: "block",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {/* tier eyebrow — blank, tier name IS the header */}
                  </span>
                  <h2
                    data-testid={`tier-heading-${tier.id}`}
                    style={{
                      fontFamily: "var(--font-manrope)",
                      fontWeight: 800,
                      fontSize: "clamp(1.75rem, 3.5vw, 3.25rem)",
                      lineHeight: 1,
                      color: "var(--foreground)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {tier.name}
                  </h2>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-manrope)",
                    fontWeight: 600,
                    fontSize: "0.8125rem",
                    letterSpacing: "0.06em",
                    color: "var(--muted-foreground)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {tierSponsors.length} · {currentYear} Season
                </span>
              </div>

              {/* Partner grid */}
              <div className={gridClass}>
                {tierSponsors.map((sponsor) => (
                  <SponsorCard
                    key={sponsor.id}
                    sponsor={sponsor}
                    tierSize={tierSize}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Open Sponsorships section — header + chip block, mirrors populated-tier header pattern */}
        {openItems.length > 0 && (
          <div
            data-testid="open-sponsorships-section"
            className="mb-20 last:mb-0"
          >
            {/* Open Sponsorships header — same structure as populated tier headers */}
            <div className="flex items-baseline justify-between mb-8 pb-4 border-t border-border pt-4">
              <div>
                <h2
                  data-testid="open-sponsorships-heading"
                  style={{
                    fontFamily: "var(--font-manrope)",
                    fontWeight: 800,
                    fontSize: "clamp(1.75rem, 3.5vw, 3.25rem)",
                    lineHeight: 1,
                    color: "var(--foreground)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Open Sponsorships
                </h2>
              </div>
              <span
                style={{
                  fontFamily: "var(--font-manrope)",
                  fontWeight: 600,
                  fontSize: "0.8125rem",
                  letterSpacing: "0.06em",
                  color: "var(--muted-foreground)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {openItems.length} Categories · {currentYear} Season
              </span>
            </div>

            <OpenSponsorshipsBlock items={openItems} />
          </div>
        )}
      </main>

      {/* Bottom CTA — individual donor, links to /donate */}
      <section
        data-testid="sponsors-cta"
        className="bg-brand-darker px-4 py-20"
      >
        <div className="mx-auto max-w-3xl text-center">
          <p
            style={{
              fontFamily: "var(--font-manrope)",
              fontWeight: 700,
              fontSize: "0.6875rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--brand)",
              marginBottom: "1rem",
            }}
          >
            Give to the Mission
          </p>
          <h2
            style={{
              fontFamily: "var(--font-manrope)",
              fontWeight: 800,
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              lineHeight: 1.1,
              color: "#FFFFFF",
              marginBottom: "1rem",
            }}
          >
            Make it possible for someone fighting right now.
          </h2>
          <p
            style={{
              fontSize: "1rem",
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.72)",
              maxWidth: "48ch",
              margin: "0 auto 2rem",
            }}
          >
            Your gift funds transportation, lodging, and medical equipment for
            cancer patients in active treatment. Every dollar goes directly to
            people who need it — no overhead, no administration fees.
          </p>
          <LinkButton
            data-testid="sponsors-cta-button"
            href="/donate"
            className="bg-white text-foreground px-8 hover:bg-brand hover:text-white transition-colors"
          >
            Donate →
          </LinkButton>
        </div>
      </section>
    </div>
  );
}
