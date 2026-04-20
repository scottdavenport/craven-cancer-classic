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
import { TeamForm } from "./team-form";
import { DeleteTeamDialog } from "./team-list";
import type { TeamWithMembers } from "./actions";

interface TeamDrawerProps {
  open: boolean;
  mode: "create" | "edit";
  team: TeamWithMembers | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TeamDrawer({
  open,
  mode,
  team,
  onOpenChange,
  onSuccess,
}: TeamDrawerProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const title =
    mode === "create" ? "New Team" : `Edit Team: ${team?.team_name ?? ""}`;

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
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="sm:max-w-[520px] flex flex-col overflow-hidden p-0"
          showCloseButton={false}
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <TeamForm
              team={mode === "edit" ? team : null}
              onSuccess={handleFormSuccess}
              onCancel={() => onOpenChange(false)}
            />
          </div>

          {mode === "edit" && team && (
            <SheetFooter className="px-6 py-4 border-t border-border/60 shrink-0">
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete team
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

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
