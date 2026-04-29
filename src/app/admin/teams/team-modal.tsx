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
import { TeamForm } from "./team-form";
import { DeleteTeamDialog } from "./team-list";
import type { TeamWithMembers } from "./actions";

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
            <DialogFooter className="px-6 py-4 border-t border-border/60 shrink-0">
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete team
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {team && (
        <DeleteTeamDialog
          team={team}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
