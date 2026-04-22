import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Trophy } from "lucide-react";
import { ProspectCaptureForm } from "@/components/public/prospect-capture-form";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Tournament scores and standings.",
};

async function getScores() {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const { data } = await supabase
    .from("scores")
    .select("*")
    .eq("year", currentYear)
    .order("total_score", { ascending: true });

  return data ?? [];
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
          <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] text-brand-light mb-3">
            Results
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">
            Leaderboard
          </h1>
          <div className="mx-auto mt-6 h-px w-16 bg-gradient-to-r from-transparent via-brand to-transparent" />
        </div>
      </section>

      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl">
          {scores.length === 0 ? (
            <div className="py-16 text-center">
              <Trophy className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 font-display text-xl font-semibold text-foreground">
                Scores Coming Soon
              </p>
              <p className="mt-2 text-muted-foreground">
                Scores will be posted after the tournament.
              </p>

              <div className="mx-auto mt-12 max-w-xl rounded-lg border border-border/60 bg-neutral-50 px-6 py-8 text-left shadow-sm">
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
                    successMessage="We'll let you know the moment scores post."
                  />
                </div>
              </div>
            </div>
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
  scores: { id: string; team_name: string; total_score: number }[];
}) {
  return (
    <div>
      <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] text-brand-light mb-3">
        {flightLabel}
      </p>
      <h2 className="font-display text-xl font-semibold text-foreground">
        {title}
      </h2>
      <div className="mt-1 h-0.5 w-12 bg-primary" />

      <div className="mt-6 overflow-hidden rounded-lg border border-border/60 shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-neutral-50">
              <th className="px-4 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground w-16">
                Pos
              </th>
              <th className="px-4 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Team
              </th>
              <th className="px-4 py-3 text-right text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
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
                  {score.team_name}
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
