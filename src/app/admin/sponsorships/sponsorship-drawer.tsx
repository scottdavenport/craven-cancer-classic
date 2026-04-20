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
import { SponsorshipForm } from "./sponsorship-form";
import {
  createSponsorshipItem,
  updateSponsorshipItem,
  type SponsorshipItemWithCount,
} from "./actions";
import type { SponsorshipItem } from "@/types/database";

interface SponsorshipDrawerProps {
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

export function SponsorshipDrawer({
  open,
  onOpenChange,
  mode,
  sponsorship,
  onSubmit,
  onDeleteRequest,
  onDelete,
}: SponsorshipDrawerProps) {
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
      // Delegate cascade check + confirm to the parent
      onDeleteRequest(sponsorship as SponsorshipItemWithCount);
    } else if (onDelete) {
      // Legacy path (no cascade support)
      onDelete();
    }
  }

  return (
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
          <SponsorshipForm
            defaultValues={mode === "edit" ? (sponsorship ?? undefined) : undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => onOpenChange(false)}
            loading={loading}
          />
        </div>

        {mode === "edit" && sponsorship && (
          <SheetFooter className="px-6 py-4 border-t border-border/60 shrink-0">
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={handleDeleteClick}
              disabled={loading}
            >
              Delete package
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
