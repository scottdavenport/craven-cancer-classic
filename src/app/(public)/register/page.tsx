import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { RegistrationForm } from "./registration-form";
import { ProspectCaptureForm } from "@/components/public/prospect-capture-form";

export const metadata: Metadata = {
  title: "Register Your Team",
  description: "Register your four-person team for the Craven Cancer Classic.",
};

async function getRegistrationData() {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const { data: eventSettings } = await supabase
    .from("event_settings")
    .select("*")
    .eq("year", currentYear)
    .single();

  // Get current registration counts
  const { count: morningCount } = await supabase
    .from("teams")
    .select("*", { count: "exact", head: true })
    .eq("year", currentYear)
    .eq("session", "morning");

  const { count: afternoonCount } = await supabase
    .from("teams")
    .select("*", { count: "exact", head: true })
    .eq("year", currentYear)
    .eq("session", "afternoon");

  return {
    eventSettings,
    morningCount: morningCount ?? 0,
    afternoonCount: afternoonCount ?? 0,
  };
}

function formatFeeHeader(cents: number): string {
  const dollars = cents / 100;
  return dollars % 1 === 0
    ? `$${dollars.toFixed(0)}`
    : `$${dollars.toFixed(2)}`;
}

export default async function RegisterPage() {
  const { eventSettings, morningCount, afternoonCount } =
    await getRegistrationData();

  const registrationOpen = eventSettings?.registration_open ?? false;
  const registrationFeeCents = eventSettings?.registration_fee_cents ?? 70000;
  const feeLabel = formatFeeHeader(registrationFeeCents);

  return (
    <div>
      {/* Header */}
      <section className="bg-[#1A2E3A] px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8BB5C9]">
            Four-Person Team &middot; {feeLabel}
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">
            Register Your Team
          </h1>
          <div className="mx-auto mt-6 h-px w-16 bg-gradient-to-r from-transparent via-[#5B8FA8] to-transparent" />
          {eventSettings?.date && (
            <p className="mt-6 text-base text-white/50">
              {new Date(eventSettings.date + "T00:00:00").toLocaleDateString(
                "en-US",
                { weekday: "long", year: "numeric", month: "long", day: "numeric" }
              )}{" "}
              &middot; {eventSettings.location}
            </p>
          )}
        </div>
      </section>

      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl">
          {!registrationOpen ? (
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-muted p-8 text-center">
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Registration is Currently Closed
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Registration for the{" "}
                  {eventSettings?.date
                    ? new Date(
                        eventSettings.date + "T00:00:00"
                      ).getFullYear()
                    : new Date().getFullYear()}{" "}
                  tournament is not yet open. Leave your name and email below
                  and we&apos;ll notify you as soon as spots are available.
                </p>
              </div>

              <div className="rounded-lg border border-border p-8">
                <h3 className="font-display text-lg font-semibold text-foreground">
                  Notify Me When Registration Opens
                </h3>
                <p className="mt-2 mb-6 text-sm text-muted-foreground">
                  We&apos;ll send you one email the moment registration goes
                  live. No spam, just the heads-up.
                </p>
                <ProspectCaptureForm
                  contactType="player"
                  notesPrefix="player prospect — notified when registration opens"
                  successMessage="You're on the list. We'll email you when registration opens."
                />
              </div>
            </div>
          ) : (
            <RegistrationForm
              morningCap={eventSettings?.morning_cap ?? 36}
              afternoonCap={eventSettings?.afternoon_cap ?? 36}
              morningCount={morningCount}
              afternoonCount={afternoonCount}
              registrationFeeCents={registrationFeeCents}
            />
          )}
        </div>
      </section>
    </div>
  );
}
