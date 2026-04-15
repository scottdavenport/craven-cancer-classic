"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Upload, Trash2 } from "lucide-react";
import {
  addScore,
  importScoresFromCSV,
  deleteScore,
  deleteAllScores,
} from "./actions";
import type { Score } from "@/types/database";

interface ScoreManagerProps {
  scores: Score[];
}

export function ScoreManager({ scores }: ScoreManagerProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const morningScores = scores.filter((s) => s.session === "morning");
  const afternoonScores = scores.filter((s) => s.session === "afternoon");

  async function handleAdd(formData: FormData) {
    setError(null);
    setLoading(true);
    try {
      const result = await addScore(formData);
      if (result && "error" in result && typeof result.error === "string") {
        setError(result.error);
      } else {
        setShowAdd(false);
        setSuccess("Score added");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch {
      setError("Failed to add score");
    } finally {
      setLoading(false);
    }
  }

  async function handleCSVImport() {
    if (!csvText.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const result = await importScoresFromCSV(csvText);
      if (result && "error" in result && typeof result.error === "string") {
        setError(result.error);
      } else if (result && "count" in result) {
        setShowCSV(false);
        setCsvText("");
        setSuccess(`Imported ${result.count} scores`);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch {
      setError("Failed to import CSV");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this score?")) return;
    await deleteScore(id);
  }

  async function handleDeleteAll() {
    if (
      !confirm(
        "Delete ALL scores for this year? This cannot be undone."
      )
    )
      return;
    setLoading(true);
    const result = await deleteAllScores();
    if (result && "error" in result && typeof result.error === "string") {
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button size="sm" onClick={() => { setShowAdd(!showAdd); setShowCSV(false); }}>
          <Plus className="mr-1 h-4 w-4" />
          Add Score
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => { setShowCSV(!showCSV); setShowAdd(false); }}
        >
          <Upload className="mr-1 h-4 w-4" />
          Import CSV
        </Button>
        {scores.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDeleteAll}
            className="ml-auto text-destructive"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle>Add Score</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={handleAdd} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="score_team">Team Name</Label>
                  <Input id="score_team" name="team_name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="score_total">Total Score</Label>
                  <Input
                    id="score_total"
                    name="total_score"
                    type="number"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="score_session">Session</Label>
                  <select
                    id="score_session"
                    name="session"
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    <option value="">N/A</option>
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? "Saving..." : "Add"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* CSV import */}
      {showCSV && (
        <Card>
          <CardHeader>
            <CardTitle>Import from CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste CSV data with columns: <code>team</code>,{" "}
              <code>score</code>, and optionally <code>session</code>.
            </p>
            <Textarea
              rows={8}
              placeholder={`team,score,session\nThe Eagles,72,morning\nBirdie Kings,68,afternoon`}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCSVImport}
                disabled={loading || !csvText.trim()}
              >
                {loading ? "Importing..." : "Import"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCSV(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scores table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Leaderboard ({scores.length} team{scores.length !== 1 ? "s" : ""})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Session</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {scores.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    No scores yet
                  </TableCell>
                </TableRow>
              ) : (
                scores.map((score, i) => (
                  <TableRow key={score.id}>
                    <TableCell className="font-medium text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {score.team_name}
                    </TableCell>
                    <TableCell>
                      {score.session ? (
                        <Badge variant="outline" className="capitalize">
                          {score.session}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {score.total_score}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          score.source === "csv" ? "secondary" : "outline"
                        }
                      >
                        {score.source}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(score.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
