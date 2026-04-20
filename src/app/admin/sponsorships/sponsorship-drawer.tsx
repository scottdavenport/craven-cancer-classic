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
import { SponsorshipForm } from "./sponsorship-form";
import {
  createSponsorshipItem,
  updateSponsorshipItem,
  deleteSponsorshipItem,
} from "./actions";
import type { SponsorshipItem } from "@/types/database";

interface SponsorshipDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  sponsorship?: SponsorshipItem | null;
  onSubmit?: () => void;
  onDelete?: () => void;
}

export function SponsorshipDrawer({
  open,
  onOpenChange,
  mode,
  sponsorship,
  onSubmit,
  onDelete,
}: SponsorshipDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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

  async function handleDeleteConfirmed() {
    if (!sponsorship) return;
    setLoading(true);
    try {
      const result = await deleteSponsorshipItem(sponsorship.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Package deleted");
      onOpenChange(false);
      onDelete?.();
    } finally {
      setLoading(false);
    }
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
                onClick={() => setConfirmOpen(true)}
                disabled={loading}
              >
                Delete package
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete "${sponsorship?.name ?? "this package"}"?`}
        description="This action cannot be undone. The package will be permanently removed."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
      />
    </>
  );
}
