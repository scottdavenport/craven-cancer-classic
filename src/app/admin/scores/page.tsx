import type { Metadata } from "next";
import { getScores } from "./actions";
import { ScoreManager } from "./score-manager";

export const metadata: Metadata = {
  title: "Manage Scores",
};

export default async function AdminScoresPage() {
  const scores = await getScores();

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Scores</h1>
      <p className="mt-1 text-muted-foreground">
        Upload scores from CSV or add manually
      </p>
      <div className="mt-8">
        <ScoreManager scores={scores} />
      </div>
    </div>
  );
}
