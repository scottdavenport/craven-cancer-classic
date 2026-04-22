"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, Upload, Trash2 } from "lucide-react";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { importScoresFromCSV, deleteAllScores } from "./actions";
import { ScoreDrawer } from "./score-drawer";
import type { Score } from "@/types/database";

interface ScoreManagerProps {
  scores: Score[];
}

type DrawerState = {
  open: boolean;
  mode: "create" | "edit";
  score: Score | null;
};

export function ScoreManager({ scores: initialScores }: ScoreManagerProps) {
  const [scores, setScores] = useState<Score[]>(initialScores);
  const [showCSV, setShowCSV] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [drawer, setDrawer] = useState<DrawerState>({
    open: false,
    mode: "create",
    score: null,
  });

  // Re-fetch is handled by revalidatePath server-side; we close drawer + refresh
  // via router.refresh() — but since ScoreManager receives scores as a prop from
  // the server component, we refresh the page to pull fresh data after mutations.
  // For now success just refreshes via window.location (simple, reliable).
  function handleSuccess() {
    window.location.reload();
  }

  async function handleCSVImport() {
    if (!csvText.trim()) return;
    setLoading(true);
    try {
      const result = await importScoresFromCSV(csvText);
      if (result && "error" in result && typeof result.error === "string") {
        toast.error(result.error);
      } else if (result && "count" in result) {
        setShowCSV(false);
        setCsvText("");
        toast.success(`Imported ${result.count} scores`);
        handleSuccess();
      }
    } catch (err) {
      console.error("[ScoreManager] importScoresFromCSV failed:", err);
      toast.error("Failed to import CSV");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAllConfirmed() {
    setLoading(true);
    try {
      const result = await deleteAllScores();
      if (result && "error" in result && typeof result.error === "string") {
        toast.error(result.error);
      } else {
        toast.success("All scores cleared");
        handleSuccess();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          size="sm"
          onClick={() => setDrawer({ open: true, mode: "create", score: null })}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Score
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowCSV(!showCSV)}
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

      {/* CSV import */}
      {showCSV && (
        <Card>
          <CardContent className="p-8 text-center">
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
          </CardContent>
        </Card>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {scores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <AdminEmptyState title="No scores yet" />
                </TableCell>
              </TableRow>
            ) : (
              scores.map((score, i) => (
                <TableRow
                  key={score.id}
                  className="cursor-pointer hover:bg-neutral-50/50 transition-colors duration-100"
                  onClick={() => setDrawer({ open: true, mode: "edit", score })}
                >
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
                      variant={score.source === "csv" ? "secondary" : "outline"}
                    >
                      {score.source}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ScoreDrawer
        open={drawer.open}
        onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}
        mode={drawer.mode}
        score={drawer.score}
        onSuccess={handleSuccess}
      />

      <ConfirmDialog
        open={confirmDeleteAll}
        onOpenChange={setConfirmDeleteAll}
        title={`Clear all scores for ${new Date().getFullYear()}?`}
        description={`This permanently removes every score for ${new Date().getFullYear()}. It cannot be undone.`}
        confirmLabel="Delete All"
        onConfirm={handleDeleteAllConfirmed}
      />
    </div>
  );
}
