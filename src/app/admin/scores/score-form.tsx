"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Score } from "@/types/database";
import type { ActiveTeamForDropdown } from "./actions";

export interface ScoreFormValues {
  team_id: string | null;
  total_score: number;
  session: "morning" | "afternoon" | null;
}

interface ScoreFormProps {
  defaultValues?: Score;
  teams: ActiveTeamForDropdown[];
  onSubmit: (values: ScoreFormValues) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ScoreForm({
  defaultValues,
  teams,
  onSubmit,
  onCancel,
  loading = false,
}: ScoreFormProps) {
  const [teamId, setTeamId] = useState<string>(defaultValues?.team_id ?? "");
  const [totalScore, setTotalScore] = useState(
    defaultValues?.total_score != null ? String(defaultValues.total_score) : ""
  );
  const [session, setSession] = useState<string>(defaultValues?.session ?? "");

  const [errors, setErrors] = useState<{ totalScore?: string }>({});

  function validate(): boolean {
    const next: typeof errors = {};
    const parsed = parseInt(totalScore, 10);
    if (totalScore.trim() === "" || isNaN(parsed)) {
      next.totalScore = "Total score is required";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const sessionValue =
      session === "morning" || session === "afternoon" ? session : null;

    await onSubmit({
      team_id: teamId || null,
      total_score: parseInt(totalScore, 10),
      session: sessionValue,
    });
  }

  const teamItems = Object.fromEntries(
    teams.map((t) => [t.id, t.captain_full_name])
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="sf-team">Team</Label>
        <Select
          value={teamId}
          onValueChange={(v) => setTeamId(v ?? "")}
          disabled={loading}
          items={teamItems}
        >
          <SelectTrigger id="sf-team" className="w-full" aria-label="Select team">
            <SelectValue placeholder="Select a team" />
          </SelectTrigger>
          <SelectContent>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.captain_full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sf-total-score">Total Score</Label>
        <Input
          id="sf-total-score"
          type="number"
          value={totalScore}
          onChange={(e) => setTotalScore(e.target.value)}
          placeholder="72"
          aria-invalid={!!errors.totalScore}
          disabled={loading}
        />
        {errors.totalScore && (
          <p className="text-xs text-destructive">{errors.totalScore}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sf-session">Session</Label>
        <Select
          value={session}
          onValueChange={(v) => setSession(v ?? "")}
          disabled={loading}
        >
          <SelectTrigger id="sf-session" className="w-full">
            <SelectValue placeholder="N/A" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">N/A</SelectItem>
            <SelectItem value="morning">Morning</SelectItem>
            <SelectItem value="afternoon">Afternoon</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
