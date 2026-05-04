"use client";

import { useState, useEffect } from "react";
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
import { createSponsor, updateSponsor, deleteSponsor, uploadSponsorLogo, getSponsorContacts, deleteSponsorLogo } from "./actions";
import type { Sponsor } from "@/types/database";
import type { ContactPickResult } from "@/components/admin/contact-typeahead";

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
  const [initialContacts, setInitialContacts] = useState<ContactPickResult[]>([]);
  const [contactsLoaded, setContactsLoaded] = useState(false);

  useEffect(() => {
    if (!open) {
      setInitialContacts([]);
      setContactsLoaded(false);
      return;
    }
    if (mode === "edit" && sponsor) {
      setContactsLoaded(false);
      getSponsorContacts(sponsor.id)
        .then((rows) => {
          setInitialContacts(
            rows.map((row) => ({
              id: row.contacts.id,
              full_name: row.contacts.full_name,
              email: row.contacts.email,
              company: null,
            }))
          );
          setContactsLoaded(true);
        })
        .catch((err) => {
          console.error("Failed to load sponsor contacts:", err);
          setContactsLoaded(true); // fail-open — show form with empty contacts rather than stuck on loading
        });
    } else {
      setContactsLoaded(true);
    }
  }, [open, mode, sponsor?.id]);

  const title =
    mode === "create"
      ? "New Sponsor"
      : `Edit Sponsor: ${sponsor?.name ?? ""}`;

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      const removeLogoFlag = formData.get("remove_logo") === "true";
      if (removeLogoFlag && sponsor?.logo_url) {
        await deleteSponsorLogo(sponsor.logo_url);
        formData.set("logo_url", "");
        formData.delete("logo");
        formData.delete("remove_logo");
      } else {
        const logoValue = formData.get("logo");
        if (logoValue instanceof File && logoValue.size > 0) {
          const uploadFormData = new FormData();
          uploadFormData.set("file", logoValue);
          if (mode === "edit" && sponsor?.logo_url) {
            uploadFormData.set("oldLogoUrl", sponsor.logo_url);
          }
          const uploadResult = await uploadSponsorLogo(uploadFormData);
          if ("error" in uploadResult) {
            toast.error(uploadResult.error);
            return;
          }
          formData.set("logo_url", uploadResult.url);
        } else if (mode === "edit" && sponsor?.logo_url) {
          formData.set("logo_url", sponsor.logo_url);
        }
        formData.delete("logo");
      }

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
      toast.success("Sponsor moved to Trash");
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
            {(mode === "create" || contactsLoaded) ? (
              <SponsorForm
                defaultValues={mode === "edit" ? sponsor : undefined}
                initialContacts={initialContacts}
                sponsorshipItems={sponsorshipItems}
                onSubmit={handleSubmit}
                onCancel={() => onOpenChange(false)}
                loading={loading}
              />
            ) : (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                Loading contacts…
              </div>
            )}
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
        description="This sponsor will be moved to Trash. You can restore from Admin → Trash."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
      />
    </>
  );
}
