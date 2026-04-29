"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { ScoreModal } from "./score-modal";
import type { Score } from "@/types/database";
import type { TeamDropdownOption } from "./actions";

interface ScoreManagerProps {
  scores: Score[];
  teams?: TeamDropdownOption[];
}

type ModalState = {
  open: boolean;
  mode: "create" | "edit";
  score: Score | null;
};

export function ScoreManager({ scores: initialScores, teams = [] }: ScoreManagerProps) {
  const router = useRouter();
  const [scores, setScores] = useState<Score[]>(initialScores);
  const [showCSV, setShowCSV] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [modal, setModal] = useState<ModalState>({
    open: false,
    mode: "create",
    score: null,
  });

  function handleSuccess() {
    router.refresh();
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
        toast.success("Year cleared");
        handleSuccess();
      }
    } finally {
      setLoading(false);
    }
  }

  function getTeamDisplay(score: Score): string {
    if (!score.team_id) return "(no team)";
    const match = teams.find((t) => t.team_id === score.team_id);
    return match?.captain_display_name ?? "(no team)";
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          size="sm"
          onClick={() => setModal({ open: true, mode: "create", score: null })}
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
              Paste CSV data with columns: <code>score</code>, and optionally <code>session</code>.
            </p>
            <Textarea
              rows={8}
              placeholder={`score,session\n72,morning\n68,afternoon`}
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
                  onClick={() => setModal({ open: true, mode: "edit", score })}
                >
                  <TableCell className="font-mono tabular-nums lining-nums text-muted-foreground">
                    {i + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    {getTeamDisplay(score)}
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

      <ScoreModal
        open={modal.open}
        onOpenChange={(open) => setModal((m) => ({ ...m, open }))}
        mode={modal.mode}
        score={modal.score}
        teams={teams}
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
