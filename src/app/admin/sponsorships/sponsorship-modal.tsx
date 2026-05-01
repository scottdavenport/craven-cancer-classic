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
import { SponsorshipForm } from "./sponsorship-form";
import {
  createSponsorshipItem,
  updateSponsorshipItem,
  type SponsorshipItemWithCount,
} from "./actions";
import type { SponsorshipItem } from "@/types/database";

interface SponsorshipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  sponsorship?: SponsorshipItemWithCount | SponsorshipItem | null;
  onSubmit?: () => void;
  /** Called when the delete button is clicked — parent handles the confirm dialog */
  onDeleteRequest?: (item: SponsorshipItemWithCount) => void;
  /** Legacy: called after delete is confirmed and completed (for backwards compat) */
  onDelete?: () => void;
}

export function SponsorshipModal({
  open,
  onOpenChange,
  mode,
  sponsorship,
  onSubmit,
  onDeleteRequest,
  onDelete,
}: SponsorshipModalProps) {
  const [loading, setLoading] = useState(false);

  const title =
    mode === "create"
      ? "New Package"
      : `Edit Package: ${sponsorship?.name ?? ""}`;

  async function handleFormSubmit(formData: FormData) {
    setLoading(true);
    try {
      const result =
        mode === "create"
          ? await createSponsorshipItem(formData)
          : await updateSponsorshipItem(sponsorship!.id, formData);

      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(mode === "create" ? "Package created" : "Package updated");
      onOpenChange(false);
      onSubmit?.();
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteClick() {
    if (!sponsorship) return;
    if (onDeleteRequest) {
      onDeleteRequest(sponsorship as SponsorshipItemWithCount);
    } else if (onDelete) {
      onDelete();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <SponsorshipForm
            defaultValues={mode === "edit" ? (sponsorship ?? undefined) : undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => onOpenChange(false)}
            loading={loading}
          />
        </div>

        {mode === "edit" && sponsorship && (
          <DialogFooter className="border-t border-border/60 pt-4 mt-2">
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={handleDeleteClick}
              disabled={loading}
            >
              Delete package
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
