import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SponsorshipSection } from "./sponsorship-section";
import { TributeSection } from "./tribute-section";
import { RecentlyHonored } from "./recently-honored";
import { SupporterSection } from "./supporter-section";
import { ProspectCaptureForm } from "@/components/public/prospect-capture-form";
import { PublicEmptyState } from "@/components/public/public-empty-state";
import { formatLifetimeRaised } from "@/lib/sponsors-utils";
import type { SponsorshipItem } from "@/types/database";

export const metadata: Metadata = {
  title: "Sponsorship Opportunities",
  description:
    "Support the Craven Cancer Classic. Browse sponsorship packages and make a direct impact.",
};

async function getSponsorshipItems(): Promise<SponsorshipItem[]> {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const { data } = await supabase
    .from("sponsorship_items")
    .select("*")
    .eq("year", currentYear)
    .eq("active", true)
    .is("deleted_at", null)
    .order("price_cents", { ascending: false })
    .order("sort_order", { ascending: true });

  return (data ?? []) as SponsorshipItem[];
}

async function getLifetimeRaisedCents(): Promise<number | null> {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const { data } = await supabase
    .from("event_settings")
    .select("lifetime_raised_cents")
    .eq("year", currentYear)
    .maybeSingle();

  return data?.lifetime_raised_cents ?? null;
}

export default async function SponsorshipsPage() {
  const [items, lifetimeRaisedCents] = await Promise.all([
    getSponsorshipItems(),
    getLifetimeRaisedCents(),
  ]);

  const lifetimeFormatted = formatLifetimeRaised(lifetimeRaisedCents);

  // Partition items by category client-side.
  // Items without a category value default to 'sponsorship' (pre-migration rows).
  const sponsorshipItems = items.filter(
    (i) => !i.category || i.category === "sponsorship"
  );
  const tributeItems = items.filter((i) => i.category === "tribute");
  const supporterItems = items.filter((i) => i.category === "supporter");

  const hasAnyItems = items.length > 0;

  return (
    <div>
      {/* Masthead */}
      <section
        style={{
          background: [
            "radial-gradient(ellipse 80% 60% at 20% -10%, rgba(87,151,166,0.18) 0%, transparent 70%)",
            "radial-gradient(ellipse 60% 50% at 85% 110%, rgba(87,151,166,0.12) 0%, transparent 65%)",
            "var(--brand-darker)",
          ].join(", "),
        }}
        className="relative overflow-hidden px-6 py-20 sm:py-28"
      >
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          {/* Eyebrow */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div
              aria-hidden="true"
              style={{ width: 28, height: 1, backgroundColor: "var(--brand)" }}
            />
            <span
              style={{
                fontFamily: "var(--font-manrope)",
                fontWeight: 700,
                fontSize: "0.6875rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--brand)",
              }}
            >
              Support the Tournament
            </span>
            <div
              aria-hidden="true"
              style={{ width: 28, height: 1, backgroundColor: "var(--brand)" }}
            />
          </div>

          {/* H1 — Manrope 800, no font-display */}
          <h1
            style={{
              fontFamily: "var(--font-manrope)",
              fontWeight: 800,
              fontSize: "clamp(2.5rem, 7vw, 4.5rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "#FFFFFF",
            }}
          >
            Sponsorship Opportunities
          </h1>

          {/* Body — Aria-approved program language */}
          <p
            className="mt-6 mx-auto max-w-2xl text-base leading-relaxed"
            style={{ color: "rgba(255,255,255,0.82)" }}
          >
            Every sponsorship funds transportation, lodging, and medical equipment
            for cancer patients in active treatment — people in our own community
            facing the hardest days of their lives.
          </p>

          {/* Inline stat — omitted entirely when lifetime_raised_cents is null */}
          {lifetimeFormatted !== null && (
            <p
              className="mt-5 text-sm font-semibold"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              <strong className="text-white">{lifetimeFormatted}</strong>{" "}
              raised since 2010
            </p>
          )}
        </div>
      </section>

      {/* Three-section layout — Sponsorships → Tributes → Supporters */}
      <div className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl space-y-20">
          {hasAnyItems ? (
            <>
              {/* Section 1: Sponsorships */}
              <SponsorshipSection items={sponsorshipItems} />

              {/* Section 2: Tributes */}
              <TributeSection items={tributeItems} />

              {/* Recently Honored — renders below Tributes per plan line 86 */}
              <RecentlyHonored />

              {/* Section 3: Supporters */}
              <SupporterSection items={supporterItems} />

              {/* Reassurance strip — below all sections, Aria-approved */}
              <div
                className="rounded-lg px-6 py-4 text-center text-sm"
                style={{
                  backgroundColor: "var(--neutral-50)",
                  color: "var(--muted-foreground)",
                }}
              >
                Selected sponsors appear on our{" "}
                <a
                  href="/sponsors"
                  className="underline underline-offset-2 hover:no-underline"
                >
                  2026 Partners page
                </a>{" "}
                alongside our other supporters. A tax receipt is emailed after
                checkout.
              </div>
            </>
          ) : (
            <div className="mx-auto max-w-lg">
              <PublicEmptyState
                title="Sponsorship Packages Coming Soon"
                body="This year's sponsorship tiers are being finalized. Leave your name and email and we will reach out as soon as packages are available."
                action={
                  <ProspectCaptureForm
                    contactType="sponsor"
                    notesPrefix="sponsor prospect — notified when packages open"
                    showCompany
                    successMessage="Thank you. We will be in touch when sponsorship packages are available."
                  />
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
