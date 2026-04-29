import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProspectCaptureForm } from "@/components/public/prospect-capture-form";
import { SectionEyebrow } from "@/components/public/section-eyebrow";
import { InfoCallout } from "@/components/public/info-callout";
import { PublicEmptyState } from "@/components/public/public-empty-state";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Tournament scores and standings.",
};

type ScoreRow = {
  id: string;
  total_score: number;
  session: string | null;
  captain_display_name: string;
};

async function getScores(): Promise<ScoreRow[]> {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const { data } = await supabase
    .from("scores")
    .select(
      "id, total_score, session, team:teams(captain:contacts!teams_captain_contact_id_fkey(full_name))"
    )
    .eq("year", currentYear)
    .not("team_id", "is", null)
    .order("total_score", { ascending: true });

  return (data ?? []).map((row) => {
    const team = row.team as {
      captain: { full_name: string } | null;
    } | null;
    return {
      id: row.id,
      total_score: row.total_score,
      session: row.session,
      captain_display_name: team?.captain?.full_name ?? "(no team)",
    };
  });
}

export default async function LeaderboardPage() {
  const scores = await getScores();

  const morningScores = scores.filter((s) => s.session === "morning");
  const afternoonScores = scores.filter((s) => s.session === "afternoon");
  const allScores = scores;

  return (
    <div>
      <section className="bg-[#1A2E3A] px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <SectionEyebrow tone="light">Results</SectionEyebrow>
          <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">
            Leaderboard
          </h1>
          <div className="mx-auto mt-6 h-px w-16 bg-gradient-to-r from-transparent via-brand to-transparent" />
        </div>
      </section>

      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl">
          {scores.length === 0 ? (
            <PublicEmptyState
              title="Scores Coming Soon"
              body="Scores will be posted after the tournament."
              action={
                <InfoCallout className="mx-auto mt-4 max-w-xl text-left">
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    Want a ping when the scores post?
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Leave your name and email. We&apos;ll send you one note when this year&apos;s results are live.
                  </p>
                  <div className="mt-6">
                    <ProspectCaptureForm
                      contactType="player"
                      showCompany={false}
                      notesPrefix="leaderboard prospect — notified when scores post"
                      successMessage="We'll let you know the moment scores post."
                    />
                  </div>
                </InfoCallout>
              }
            />
          ) : (
            <div className="space-y-12">
              {morningScores.length > 0 && (
                <ScoreTable title="Morning Session" flightLabel="Morning Flight" scores={morningScores} />
              )}
              {afternoonScores.length > 0 && (
                <ScoreTable
                  title="Afternoon Session"
                  flightLabel="Afternoon Flight"
                  scores={afternoonScores}
                />
              )}
              {morningScores.length === 0 && afternoonScores.length === 0 && (
                <ScoreTable title="Overall Standings" flightLabel="Tournament Standings" scores={allScores} />
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function PositionCell({ index }: { index: number }) {
  if (index === 0) {
    return (
      <span className="font-display font-bold text-base text-[#C9A84C]">1</span>
    );
  }
  if (index === 1) {
    return (
      <span className="font-display font-bold text-base text-neutral-400">2</span>
    );
  }
  if (index === 2) {
    return (
      <span className="font-display font-bold text-base text-[#A87D50]">3</span>
    );
  }
  return (
    <span className="font-sans text-sm text-muted-foreground">{index + 1}</span>
  );
}

function ScoreTable({
  title,
  flightLabel,
  scores,
}: {
  title: string;
  flightLabel: string;
  scores: ScoreRow[];
}) {
  return (
    <div>
      <SectionEyebrow tone="light">{flightLabel}</SectionEyebrow>
      <h2 className="font-display text-xl font-semibold text-foreground">
        {title}
      </h2>
      <div className="mt-1 h-0.5 w-12 bg-primary" />

      <div className="mt-6 overflow-hidden rounded-lg border border-border/60 shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-neutral-50">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground w-16">
                Pos
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Team
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Score
              </th>
            </tr>
          </thead>
          <tbody>
            {scores.map((score, i) => (
              <tr
                key={score.id}
                className={`border-b border-border/50 last:border-0 ${
                  i < 3 ? "border-l-2 border-l-primary" : "border-l-2 border-l-transparent"
                }`}
              >
                <td className="px-4 py-3">
                  <PositionCell index={i} />
                </td>
                <td className="px-4 py-3 font-sans text-[0.9375rem] font-medium text-foreground">
                  {score.captain_display_name}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums lining-nums text-lg font-bold text-foreground">
                  {score.total_score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
