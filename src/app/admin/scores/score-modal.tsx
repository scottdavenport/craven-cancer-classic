"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ScoreForm } from "./score-form";
import { addScore, updateScore, deleteScore } from "./actions";
import type { ActiveTeamForDropdown } from "./actions";
import type { Score } from "@/types/database";

interface ScoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  score?: Score | null;
  teams: ActiveTeamForDropdown[];
  onSuccess: () => void;
}

export function ScoreModal({
  open,
  onOpenChange,
  mode,
  score,
  teams,
  onSuccess,
}: ScoreModalProps) {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const title = mode === "create" ? "Add Score" : "Edit Score";

  async function handleSubmit(values: {
    team_id: string | null;
    total_score: number;
    session: "morning" | "afternoon" | null;
  }) {
    setLoading(true);
    try {
      if (mode === "create") {
        const result = await addScore(values);
        if (result && "error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Score added");
      } else {
        if (!score) return;
        const result = await updateScore(score.id, values);
        if (result && "error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Score updated");
      }
      onOpenChange(false);
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!score) return;
    const result = await deleteScore(score.id);
    if (result && "error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Score deleted");
    onOpenChange(false);
    onSuccess();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-[800px] flex flex-col overflow-hidden p-0"
          showCloseButton={false}
        >
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <ScoreForm
              defaultValues={score ?? undefined}
              teams={teams}
              onSubmit={handleSubmit}
              onCancel={() => onOpenChange(false)}
              loading={loading}
            />
          </div>

          {mode === "edit" && score && (
            <DialogFooter className="px-6 py-4 border-t border-border/60 shrink-0">
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setConfirmOpen(true)}
                disabled={loading}
              >
                Delete score
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this score?"
        description="This score will be permanently removed."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
      />
    </>
  );
}
