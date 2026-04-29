import type { Metadata } from "next";
import { getScores, getActiveTeamsForDropdown } from "./actions";
import { ScoreManager } from "./score-manager";
import { AdminPageHeading } from "@/components/admin/admin-page-heading";

export const metadata: Metadata = {
  title: "Manage Scores",
};

export default async function AdminScoresPage() {
  const [scores, teams] = await Promise.all([
    getScores(),
    getActiveTeamsForDropdown(),
  ]);

  return (
    <div>
      <AdminPageHeading
        title="Scores"
        description="Import CSV scores and manage the leaderboard data."
      />
      <ScoreManager scores={scores} teams={teams} />
    </div>
  );
}
