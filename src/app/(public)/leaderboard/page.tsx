import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Trophy } from "lucide-react";

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
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8BB5C9]">
            Results
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">
            Leaderboard
          </h1>
          <div className="mx-auto mt-6 h-px w-16 bg-gradient-to-r from-transparent via-[#5B8FA8] to-transparent" />
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
            </div>
          ) : (
            <div className="space-y-12">
              {morningScores.length > 0 && (
                <ScoreTable title="Morning Session" scores={morningScores} />
              )}
              {afternoonScores.length > 0 && (
                <ScoreTable
                  title="Afternoon Session"
                  scores={afternoonScores}
                />
              )}
              {morningScores.length === 0 && afternoonScores.length === 0 && (
                <ScoreTable title="Overall Standings" scores={allScores} />
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ScoreTable({
  title,
  scores,
}: {
  title: string;
  scores: { id: string; team_name: string; total_score: number }[];
}) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-foreground">
        {title}
      </h2>
      <div className="mt-1 h-px w-12 bg-primary/30" />

      <div className="mt-6 overflow-hidden rounded-lg border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-16">
                Pos
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Team
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Score
              </th>
            </tr>
          </thead>
          <tbody>
            {scores.map((score, i) => (
              <tr
                key={score.id}
                className={`border-b border-border/50 last:border-0 ${
                  i < 3 ? "bg-primary/5" : ""
                }`}
              >
                <td className="px-4 py-3">
                  {i === 0 ? (
                    <span className="text-lg">🥇</span>
                  ) : i === 1 ? (
                    <span className="text-lg">🥈</span>
                  ) : i === 2 ? (
                    <span className="text-lg">🥉</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {i + 1}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">
                  {score.team_name}
                </td>
                <td className="px-4 py-3 text-right font-mono text-lg font-bold text-foreground">
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
