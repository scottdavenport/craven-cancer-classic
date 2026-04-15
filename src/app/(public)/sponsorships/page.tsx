import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SponsorshipGrid } from "./sponsorship-grid";

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
    .order("price", { ascending: false });

  return data ?? [];
}

export default async function SponsorshipsPage() {
  const items = await getSponsorshipItems();

  return (
    <div>
      {/* Header */}
      <section className="bg-[#1A2E3A] px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8BB5C9]">
            Support the Tournament
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">
            Sponsorship Opportunities
          </h1>
          <div className="mx-auto mt-6 h-px w-16 bg-gradient-to-r from-transparent via-[#5B8FA8] to-transparent" />
          <p className="mt-6 text-base text-white/50">
            Every sponsorship directly supports cancer patients in our community
            through the Carolina East Health Foundation.
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl">
          {items.length > 0 ? (
            <SponsorshipGrid items={items} />
          ) : (
            <div className="py-12 text-center">
              <p className="font-display text-xl font-semibold text-foreground">
                Sponsorship packages coming soon
              </p>
              <p className="mt-2 text-muted-foreground">
                Check back for available sponsorship opportunities.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
