import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SponsorshipGrid } from "./sponsorship-grid";
import { ProspectCaptureForm } from "@/components/public/prospect-capture-form";
import { SectionEyebrow } from "@/components/public/section-eyebrow";
import { PublicEmptyState } from "@/components/public/public-empty-state";

export const metadata: Metadata = {
  title: "Sponsorship Opportunities",
  description:
    "Support the Craven Cancer Classic. Browse sponsorship packages and make a direct impact.",
};

async function getSponsorshipItems() {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const { data } = await supabase
    .from("sponsorship_items")
    .select("*")
    .eq("year", currentYear)
    .eq("active", true)
    .is("deleted_at", null)
    .order("price_cents", { ascending: false });

  return data ?? [];
}

export default async function SponsorshipsPage() {
  const items = await getSponsorshipItems();

  return (
    <div>
      {/* Header */}
      <section className="bg-[#1A2E3A] px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <SectionEyebrow tone="light">Support the Tournament</SectionEyebrow>
          <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">
            Sponsorship Opportunities
          </h1>
          <div className="mx-auto mt-6 h-px w-16 bg-gradient-to-r from-transparent via-brand to-transparent" />
          <p className="mt-6 text-base text-white/70">
            Every sponsorship directly supports cancer patients in our community
            through the Carolina East Health Foundation.
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl">
          {/* Mission context */}
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <SectionEyebrow tone="light">Our Mission</SectionEyebrow>
            <p className="font-sans text-[0.9375rem] leading-[1.8] text-muted-foreground">
              Since 2010, the Craven Cancer Classic has raised over{" "}
              <strong className="font-semibold text-foreground">$450,000</strong>{" "}
              for cancer patients in Craven County. Your sponsorship funds
              transportation to treatment, lodging during extended care, and
              medical equipment for patients who need it most — people in our
              own community facing the hardest days of their lives. This
              tournament is held in their honor and in loving memory of those
              we have lost.
            </p>
          </div>

          {/* Section heading above grid */}
          {items.length > 0 && (
            <div className="mb-10 text-center">
              <SectionEyebrow tone="light">2026 Sponsorship Packages</SectionEyebrow>
              <h2 className="font-display text-[1.75rem] font-semibold text-foreground">
                Support the Classic
              </h2>
            </div>
          )}

          {items.length > 0 ? (
            <SponsorshipGrid items={items} />
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
      </section>
    </div>
  );
}
