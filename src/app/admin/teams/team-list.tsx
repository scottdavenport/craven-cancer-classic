"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { markTeamPaid, deleteTeam, getScoreCount } from "./actions";
import { TeamForm } from "./team-form";
import type { TeamWithMembers } from "./actions";

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

function PaymentStatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    paid: "bg-success-muted text-success",
    pending: "bg-warning-muted text-warning",
    failed: "bg-destructive/10 text-destructive",
    comped: "bg-neutral-100 text-neutral-600",
  };
  const cls = classes[status] ?? "bg-neutral-100 text-neutral-600";
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold capitalize ${cls}`}
    >
      {status}
    </span>
  );
}

function OpenSlotsBadge({ open }: { open: number }) {
  if (open === 0) return null;
  return (
    <span className="inline-flex items-center rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold bg-amber-100 text-amber-700">
      {open} open
    </span>
  );
}

function SessionBadge({ session }: { session: string }) {
  return (
    <span className="inline-flex items-center rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] bg-neutral-100 text-neutral-600">
      {session}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Mark Paid inline form
// ---------------------------------------------------------------------------

interface MarkPaidFormProps {
  team: TeamWithMembers;
  defaultFeeDollars: number;
  onDone: () => void;
  onCancel: () => void;
}

function MarkPaidForm({ team, defaultFeeDollars, onDone, onCancel }: MarkPaidFormProps) {
  const [amount, setAmount] = useState(String(defaultFeeDollars || ""));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    const dollars = parseFloat(amount);
    if (isNaN(dollars) || dollars < 0) {
      setError("Enter a valid dollar amount.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await markTeamPaid(team.id, Math.round(dollars * 100));
        if ("error" in result) {
          setError(result.error);
          return;
        }
        onDone();
      } catch (err) {
        console.error("[MarkPaidForm] markTeamPaid failed:", err);
        setError("Failed to mark team paid. Please try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 py-2">
      <div className="space-y-1.5">
        <Label htmlFor={`paid-amount-${team.id}`}>Amount paid ($)</Label>
        <Input
          id={`paid-amount-${team.id}`}
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-36"
          placeholder="0.00"
        />
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={handleConfirm} disabled={pending}>
          {pending ? "Saving..." : "Confirm"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete Team Dialog
// ---------------------------------------------------------------------------

interface DeleteTeamDialogProps {
  team: TeamWithMembers;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

function DeleteTeamDialog({ team, open, onOpenChange, onDeleted }: DeleteTeamDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [scoreCount, setScoreCount] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isPaid = team.payment_status === "paid" && team.amount_paid_cents > 0;
  const hasScores = scoreCount !== null && scoreCount > 0;
  const requiresTypeConfirm = isPaid;
  const deleteEnabled = !requiresTypeConfirm || confirmText === team.team_name;

  const captainName = team.members.find((m) => m.role === "captain")?.full_name ?? "—";
  const amountDollars = (team.amount_paid_cents / 100).toFixed(2);

  // Fetch score count when dialog opens
  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen && scoreCount === null) {
      getScoreCount(team.id).then(setScoreCount);
    }
    if (!nextOpen) {
      setConfirmText("");
      setError(null);
      setScoreCount(null);
    }
    onOpenChange(nextOpen);
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteTeam(team.id);
        if ("error" in result) {
          setError(result.error);
          return;
        }
        onOpenChange(false);
        onDeleted();
      } catch (err) {
        console.error("[DeleteTeamDialog] deleteTeam failed:", err);
        setError("Failed to delete team. Please try again.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">
            Delete team &ldquo;{team.team_name}&rdquo;?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Paid warning */}
          {isPaid && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm space-y-1">
              <p className="font-semibold text-destructive">
                Warning: This team paid ${amountDollars}.
              </p>
              <p className="text-muted-foreground">
                Deleting will NOT refund — handle the refund in Stripe manually if needed.
              </p>
            </div>
          )}

          {/* Score count notice */}
          {scoreCount === null ? (
            <p className="text-sm text-muted-foreground">Loading score data&hellip;</p>
          ) : hasScores ? (
            <p className="text-sm text-muted-foreground">
              This team has <span className="font-semibold">{scoreCount} score(s)</span>.
              They&apos;ll remain on the scores page but disconnected from the team record.
            </p>
          ) : null}

          {/* Team info */}
          <p className="text-sm text-muted-foreground">
            Members: {team.member_count}/4 &middot; Captain: {captainName}
          </p>

          <p className="text-sm text-muted-foreground">
            The team will be moved to Trash. You can restore from Admin &rarr; Trash later.
          </p>

          {/* Type-to-confirm for paid teams */}
          {requiresTypeConfirm && (
            <div className="space-y-1.5">
              <Label htmlFor={`delete-confirm-${team.id}`}>
                Type the team name <span className="font-semibold">exactly</span> to confirm:
              </Label>
              <Input
                id={`delete-confirm-${team.id}`}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={team.team_name}
                autoComplete="off"
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={!deleteEnabled || pending || scoreCount === null}
          >
            {pending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// TeamList
// ---------------------------------------------------------------------------

interface TeamListProps {
  teams: TeamWithMembers[];
  defaultFeeDollars: number;
}

type ModalState =
  | { type: "none" }
  | { type: "new" }
  | { type: "edit"; team: TeamWithMembers };

export function TeamList({ teams: initialTeams, defaultFeeDollars }: TeamListProps) {
  const [teams, setTeams] = useState<TeamWithMembers[]>(initialTeams);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<TeamWithMembers | null>(null);

  // After a mutation we refresh by reloading the page (server component pattern)
  function handleFormSuccess() {
    setModal({ type: "none" });
    window.location.reload();
  }

  function handleMarkPaidDone() {
    setMarkingPaidId(null);
    window.location.reload();
  }

  function handleDeleted() {
    window.location.reload();
  }

  const captainName = (team: TeamWithMembers): string => {
    const captain = team.members.find((m) => m.role === "captain");
    return captain?.full_name ?? "—";
  };

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <p className="text-[0.8125rem] text-muted-foreground">
          {teams.length} team{teams.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={() => setModal({ type: "new" })}>
          <Plus className="size-4" />
          New Team
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border/60 shadow-sm">
        <Table>
          <TableHeader className="bg-neutral-50">
            <TableRow>
              {["Team Name", "Captain", "Members", "Session", "Payment", "Open Slots", "Actions"].map(
                (h) => (
                  <TableHead
                    key={h}
                    className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                  >
                    {h}
                  </TableHead>
                )
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="py-16 flex flex-col items-center gap-3">
                    <h3 className="font-display text-xl font-semibold text-foreground">
                      No teams yet
                    </h3>
                    <p className="font-sans text-sm text-muted-foreground max-w-xs text-center">
                      Use the &quot;New Team&quot; button above to build the first team.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              teams.map((team) => (
                <>
                  <TableRow
                    key={team.id}
                    className="border-t border-border/60 hover:bg-neutral-50/50 transition-colors duration-100"
                  >
                    {/* Team Name */}
                    <TableCell className="px-4 py-3">
                      <span className="text-[0.8125rem] font-medium text-foreground">
                        {team.team_name}
                      </span>
                    </TableCell>

                    {/* Captain */}
                    <TableCell className="px-4 py-3 text-[0.8125rem] text-muted-foreground">
                      {captainName(team)}
                    </TableCell>

                    {/* Members */}
                    <TableCell className="px-4 py-3 text-[0.8125rem] text-foreground tabular-nums">
                      {team.member_count}/4
                    </TableCell>

                    {/* Session */}
                    <TableCell className="px-4 py-3">
                      <SessionBadge session={team.session} />
                    </TableCell>

                    {/* Payment status */}
                    <TableCell className="px-4 py-3">
                      <PaymentStatusBadge status={team.payment_status} />
                    </TableCell>

                    {/* Open slots */}
                    <TableCell className="px-4 py-3">
                      {team.open_slots > 0 ? (
                        <OpenSlotsBadge open={team.open_slots} />
                      ) : (
                        <span className="text-[0.75rem] text-muted-foreground">Full</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setModal({ type: "edit", team })}
                        >
                          Edit
                        </Button>
                        {team.payment_status !== "paid" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setMarkingPaidId(
                                markingPaidId === team.id ? null : team.id
                              )
                            }
                          >
                            Mark Paid
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                          onClick={() => setDeletingTeam(team)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Inline Mark Paid form */}
                  {markingPaidId === team.id && (
                    <TableRow key={`${team.id}-mark-paid`} className="bg-neutral-50">
                      <TableCell colSpan={7} className="px-6 py-4">
                        <MarkPaidForm
                          team={team}
                          defaultFeeDollars={defaultFeeDollars}
                          onDone={handleMarkPaidDone}
                          onCancel={() => setMarkingPaidId(null)}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* New / Edit modal */}
      <Dialog
        open={modal.type !== "none"}
        onOpenChange={(open) => {
          if (!open) setModal({ type: "none" });
        }}
      >
        <DialogContent className="sm:max-w-lg overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {modal.type === "edit" ? `Edit: ${modal.team.team_name}` : "New Team"}
            </DialogTitle>
          </DialogHeader>
          <TeamForm
            team={modal.type === "edit" ? modal.team : null}
            onSuccess={handleFormSuccess}
            onCancel={() => setModal({ type: "none" })}
          />
          <DialogFooter />
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      {deletingTeam && (
        <DeleteTeamDialog
          team={deletingTeam}
          open={deletingTeam !== null}
          onOpenChange={(open) => { if (!open) setDeletingTeam(null); }}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
