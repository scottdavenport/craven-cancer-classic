import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { RegistrationForm } from "./registration-form";

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

export default async function RegisterPage() {
  const { eventSettings, morningCount, afternoonCount } =
    await getRegistrationData();

  const registrationOpen = eventSettings?.registration_open ?? false;

  return (
    <div>
      {/* Header */}
      <section className="bg-[#1A2E3A] px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8BB5C9]">
            Four-Person Team &middot; $700
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
            <div className="rounded-lg border border-border bg-muted p-8 text-center">
              <h2 className="font-display text-xl font-semibold text-foreground">
                Registration is Currently Closed
              </h2>
              <p className="mt-3 text-muted-foreground">
                Check back soon or follow us on social media for updates on when
                registration opens.
              </p>
            </div>
          ) : (
            <RegistrationForm
              morningCap={eventSettings?.morning_cap ?? 36}
              afternoonCap={eventSettings?.afternoon_cap ?? 36}
              morningCount={morningCount}
              afternoonCount={afternoonCount}
            />
          )}
        </div>
      </section>
    </div>
  );
}
