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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  const [session, setSession] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  async function handleAdd(formData: FormData) {
    setError(null);
    setLoading(true);
    try {
      const result = await addScore(formData);
      if (result && "error" in result && typeof result.error === "string") {
        setError(result.error);
      } else {
        setShowAdd(false);
        setSession("");
        setSuccess("Score added");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('[ScoreManager] addScore failed:', err);
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
    } catch (err) {
      console.error('[ScoreManager] importScoresFromCSV failed:', err);
      setError("Failed to import CSV");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    await deleteScore(deleteTarget);
  }

  async function handleDeleteAllConfirmed() {
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
        <div className="rounded-md bg-destructive/10 text-destructive border border-destructive/20 p-3 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-success-muted text-success border border-success/20 p-3 text-sm">
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
            onClick={() => setConfirmDeleteAll(true)}
            className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
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
                  <input type="hidden" name="session" value={session} />
                  <Select value={session} onValueChange={(v) => setSession(v ?? "")}>
                    <SelectTrigger id="score_session" className="h-8 w-full">
                      <SelectValue placeholder="N/A" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">N/A</SelectItem>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="afternoon">Afternoon</SelectItem>
                    </SelectContent>
                  </Select>
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
        <div className="border-2 border-dashed border-border/60 rounded-lg p-8 text-center bg-neutral-50 hover:border-primary/40 hover:bg-primary/5 transition-colors duration-150">
          <p className="mb-4 text-sm font-medium text-foreground">Import from CSV</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Paste CSV data with columns: <code>team</code>,{" "}
            <code>score</code>, and optionally <code>session</code>.
          </p>
          <Textarea
            rows={8}
            placeholder={`team,score,session\nThe Eagles,72,morning\nBirdie Kings,68,afternoon`}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="mb-4"
          />
          <div className="flex justify-center gap-2">
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
        </div>
      )}

      {/* Scores table */}
      <div className="shadow-sm border border-border/60 rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-neutral-50">
            <TableRow>
              <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground w-12">#</TableHead>
              <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Team</TableHead>
              <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Session</TableHead>
              <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground text-right">Score</TableHead>
              <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Source</TableHead>
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
                  <TableCell className="font-mono tabular-nums lining-nums text-muted-foreground">
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
                  <TableCell className="text-right font-mono tabular-nums lining-nums font-bold">
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
                      onClick={() => setDeleteTarget(score.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete this score?"
        description="This score will be permanently removed."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
      />

      <ConfirmDialog
        open={confirmDeleteAll}
        onOpenChange={setConfirmDeleteAll}
        title="Delete ALL scores for this year?"
        description="This cannot be undone. All scores for the current year will be permanently removed."
        confirmLabel="Delete All"
        onConfirm={handleDeleteAllConfirmed}
      />
    </div>
  );
}
