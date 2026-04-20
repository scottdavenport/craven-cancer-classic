"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ScoreForm } from "./score-form";
import { addScore, updateScore, deleteScore } from "./actions";
import type { Score } from "@/types/database";

interface ScoreDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  score?: Score | null;
  onSuccess: () => void;
}

export function ScoreDrawer({
  open,
  onOpenChange,
  mode,
  score,
  onSuccess,
}: ScoreDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const title =
    mode === "create" ? "Add Score" : `Edit Score: ${score?.team_name ?? ""}`;

  async function handleSubmit(values: {
    team_name: string;
    total_score: number;
    session: "morning" | "afternoon" | null;
  }) {
    setLoading(true);
    try {
      if (mode === "create") {
        const formData = new FormData();
        formData.set("team_name", values.team_name);
        formData.set("total_score", String(values.total_score));
        if (values.session) formData.set("session", values.session);
        const result = await addScore(formData);
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
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="sm:max-w-[480px] flex flex-col overflow-hidden p-0"
          showCloseButton={false}
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <ScoreForm
              defaultValues={score ?? undefined}
              onSubmit={handleSubmit}
              onCancel={() => onOpenChange(false)}
              loading={loading}
            />
          </div>

          {mode === "edit" && score && (
            <SheetFooter className="px-6 py-4 border-t border-border/60 shrink-0">
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setConfirmOpen(true)}
                disabled={loading}
              >
                Delete score
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete score for ${score?.team_name ?? "this team"}?`}
        description="This score will be permanently removed."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
      />
    </>
  );
}
