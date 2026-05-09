"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeamForm } from "./team-form";
import { deleteTeam, getScoreCount } from "./actions";
import type { TeamWithMembers } from "./actions";

// ---------------------------------------------------------------------------
// Delete-confirm dialog — Aria Phase 3 §B7 (4-variant body)
// ---------------------------------------------------------------------------

interface DeleteConfirmDialogProps {
  team: TeamWithMembers;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

function buildMemberNameList(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  // Up to 3 names shown, then "+ N more"
  const shown = names.slice(0, 3);
  const remainder = names.length - 3;
  if (remainder <= 0) return shown.slice(0, -1).join(", ") + ", and " + shown[shown.length - 1];
  return shown.join(", ") + `, and ${remainder} more`;
}

function buildDeleteBody(
  captainName: string | null,
  memberCount: number,
  memberNames: string[],
  scoreCount: number
): string {
  const hasMembers = memberCount > 0;
  const hasScores = scoreCount > 0;

  if (!hasMembers && !hasScores) {
    // Variant 1 — zero members, zero score records
    return "Moving this team to Trash removes it from the active list. You can restore it from Admin → Trash.";
  }

  if (hasMembers && !hasScores) {
    // Variant 2 — has members, zero score records
    const nameList = buildMemberNameList(memberNames);
    if (memberCount === 1) {
      return `1 member is on this team: ${nameList}. Moving this team to Trash keeps that record intact.`;
    }
    return `${memberCount} members are on this team: ${nameList}. Moving this team to Trash keeps those records intact.`;
  }

  if (!hasMembers && hasScores) {
    // Variant 3 — zero members, has score records
    if (scoreCount === 1) {
      return `1 player score record is linked to this team. Moving this team to Trash keeps that record intact — it will display "(no team)" where the team name appeared.`;
    }
    return `${scoreCount} player score records are linked to this team. Moving this team to Trash keeps those records intact — they will display "(no team)" where the team name appeared.`;
  }

  // Variant 4 — has members AND has score records
  const nameList = buildMemberNameList(memberNames);
  return `${memberCount} members are on this team: ${nameList}. ${scoreCount} player score records are linked. Moving this team to Trash keeps all records intact — score records will display "(no team)" where the team name appeared.`;
}

function DeleteConfirmDialog({ team, open, onOpenChange, onDeleted }: DeleteConfirmDialogProps) {
  const [scoreCount, setScoreCount] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const captainMember = team.members.find((m) => m.role === "captain");
  const captainName = captainMember?.full_name?.trim() ? captainMember.full_name : null;

  // #393: type-to-confirm gate for paid teams.
  // Source of truth: captain_display_name (always non-null on team row, matches dialog title).
  const isPaid = team.payment_status === "paid" && team.amount_paid_cents > 0;
  const expectedConfirm = team.captain_display_name;
  const hasUsableConfirm = expectedConfirm.trim().length > 0;
  const requiresTypeConfirm = isPaid && hasUsableConfirm;
  const matches = confirmText === expectedConfirm; // strict exact-match (case + whitespace)
  const deleteEnabled = !requiresTypeConfirm || matches;

  // Defense-in-depth: surface bad data without locking the admin out.
  // Live in an effect (not render body) to avoid Strict Mode double-fires.
  useEffect(() => {
    if (isPaid && !hasUsableConfirm) {
      console.warn(
        "[DeleteConfirmDialog] paid team has empty captain_display_name; gate skipped",
        { teamId: team.id }
      );
    }
  }, [isPaid, hasUsableConfirm, team.id]);

  // All non-captain member names
  const memberNames = team.members
    .filter((m) => m.role !== "captain")
    .map((m) => m.full_name?.trim() || "(deleted contact)");

  // Total member count includes captain
  const memberCount = team.members.length;

  // Title: possessive captain name or fallback — Aria Phase 3 §B7
  const dialogTitle = captainName
    ? `Delete ${captainName}'s team?`
    : "Delete this team?";

  // Fetch score count when dialog opens; reset transient state on close.
  useEffect(() => {
    if (open && scoreCount === null) {
      getScoreCount(team.id).then(setScoreCount);
    }
    if (!open) {
      setError(null);
      setScoreCount(null);
      setConfirmText("");
    }
  }, [open, team.id, scoreCount]);

  // Reset gate input when the team prop changes (defensive — prevents prior
  // entry from bleeding into a new team's gate if the parent swaps `team` while
  // the dialog stays open).
  useEffect(() => {
    setConfirmText("");
  }, [team.id]);

  async function handleDelete() {
    setError(null);
    setPending(true);
    try {
      const result = await deleteTeam(team.id);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      onDeleted();
    } catch (err) {
      console.error("[DeleteConfirmDialog] deleteTeam failed:", err);
      setError("Failed to delete team. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const bodyText =
    scoreCount === null
      ? "Loading…"
      : buildDeleteBody(captainName, memberCount, memberNames, scoreCount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-destructive">{dialogTitle}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{bodyText}</p>
        {requiresTypeConfirm && (
          <div className="space-y-2">
            <label htmlFor="delete-confirm-input" className="text-sm">
              Type the captain's full name to confirm:{" "}
              <span className="font-medium">{expectedConfirm}</span>
            </label>
            <Input
              id="delete-confirm-input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={expectedConfirm}
              autoComplete="off"
              data-testid="delete-confirm-input"
            />
          </div>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={pending || scoreCount === null || !deleteEnabled}
          >
            {pending ? "Moving…" : "Move to Trash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// TeamModal
// ---------------------------------------------------------------------------

interface TeamModalProps {
  open: boolean;
  mode: "create" | "edit";
  team: TeamWithMembers | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TeamModal({
  open,
  mode,
  team,
  onOpenChange,
  onSuccess,
}: TeamModalProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const captainMember = team?.members.find((m) => m.role === "captain");
  const captainDisplay = captainMember?.full_name?.trim()
    ? captainMember.full_name
    : "(deleted contact)";

  const title =
    mode === "create" ? "New Team" : `Edit Team: ${captainDisplay}`;

  function handleFormSuccess() {
    toast.success(mode === "create" ? "Team created" : "Team updated");
    onOpenChange(false);
    onSuccess();
  }

  function handleDeleted() {
    toast.success("Team moved to Trash");
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
            <TeamForm
              team={mode === "edit" ? team : null}
              onSuccess={handleFormSuccess}
              onCancel={() => onOpenChange(false)}
            />
          </div>

          {mode === "edit" && team && (
            <DialogFooter className="px-6 py-4 border-t border-border/60 shrink-0 flex flex-row items-center justify-between">
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete team
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {team && (
        <DeleteConfirmDialog
          team={team}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
