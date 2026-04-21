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

export interface ScoreFormValues {
  team_name: string;
  total_score: number;
  session: "morning" | "afternoon" | null;
}

interface ScoreFormProps {
  defaultValues?: Score;
  onSubmit: (values: ScoreFormValues) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ScoreForm({
  defaultValues,
  onSubmit,
  onCancel,
  loading = false,
}: ScoreFormProps) {
  const [teamName, setTeamName] = useState(defaultValues?.team_name ?? "");
  const [totalScore, setTotalScore] = useState(
    defaultValues?.total_score != null ? String(defaultValues.total_score) : ""
  );
  // Store session as "" (N/A), "morning", or "afternoon"
  const [session, setSession] = useState<string>(defaultValues?.session ?? "");

  const [errors, setErrors] = useState<{ teamName?: string; totalScore?: string }>({});

  function validate(): boolean {
    const next: typeof errors = {};
    if (!teamName.trim()) next.teamName = "Team name is required";
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
      team_name: teamName.trim(),
      total_score: parseInt(totalScore, 10),
      session: sessionValue,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="sf-team-name">Team Name</Label>
        <Input
          id="sf-team-name"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="The Eagles"
          aria-invalid={!!errors.teamName}
          disabled={loading}
        />
        {errors.teamName && (
          <p className="text-xs text-destructive">{errors.teamName}</p>
        )}
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
          items={{ "": "N/A", morning: "Morning", afternoon: "Afternoon" }}
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
