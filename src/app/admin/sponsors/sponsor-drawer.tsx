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
import { SponsorForm } from "./sponsor-form";
import type { SponsorshipItemOption } from "./sponsor-form";
import { createSponsor, updateSponsor, deleteSponsor } from "./actions";
import type { Sponsor } from "@/types/database";

interface SponsorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  sponsor?: Sponsor;
  sponsorshipItems: SponsorshipItemOption[];
  onSuccess: () => void;
}

export function SponsorDrawer({
  open,
  onOpenChange,
  mode,
  sponsor,
  sponsorshipItems,
  onSuccess,
}: SponsorDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const title =
    mode === "create"
      ? "New Sponsor"
      : `Edit Sponsor: ${sponsor?.name ?? ""}`;

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      const result =
        mode === "create"
          ? await createSponsor(formData)
          : await updateSponsor(sponsor!.id, formData);

      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(mode === "create" ? "Sponsor created" : "Sponsor updated");
      onOpenChange(false);
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!sponsor) return;
    setLoading(true);
    try {
      const result = await deleteSponsor(sponsor.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Sponsor deleted");
      onOpenChange(false);
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="sm:max-w-[540px] flex flex-col overflow-hidden p-0"
          showCloseButton={false}
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <SponsorForm
              defaultValues={mode === "edit" ? sponsor : undefined}
              sponsorshipItems={sponsorshipItems}
              onSubmit={handleSubmit}
              onCancel={() => onOpenChange(false)}
              loading={loading}
            />
          </div>

          {mode === "edit" && sponsor && (
            <SheetFooter className="px-6 py-4 border-t border-border/60 shrink-0">
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setConfirmOpen(true)}
                disabled={loading}
              >
                Delete sponsor
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${sponsor?.name ?? "this sponsor"}?`}
        description="This sponsor will be removed. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
      />
    </>
  );
}
