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
import { SponsorForm } from "./sponsor-form";
import type { SponsorshipItemOption } from "./sponsor-form";
import {
  createSponsor,
  updateSponsor,
  deleteSponsor,
  uploadSponsorLogo,
  getSponsorContacts,
  deleteSponsorLogo,
  getSponsorPurchaseCount,
} from "./actions";
import type { Sponsor } from "@/types/database";
import type { ContactPickResult } from "@/components/admin/contact-typeahead";

interface SponsorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  sponsor?: Sponsor;
  sponsorshipItems: SponsorshipItemOption[];
  onSuccess: () => void;
}

export function SponsorModal({
  open,
  onOpenChange,
  mode,
  sponsor,
  sponsorshipItems,
  onSuccess,
}: SponsorModalProps) {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [initialContacts, setInitialContacts] = useState<ContactPickResult[]>([]);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [purchaseCount, setPurchaseCount] = useState<number>(0);

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

  async function handleDeleteClick() {
    if (!sponsor) return;
    setLoading(true);
    try {
      const count = await getSponsorPurchaseCount(sponsor.id);
      setPurchaseCount(count);
    } catch (err) {
      console.warn(
        "[SponsorModal] getSponsorPurchaseCount failed; falling back to zero-linked copy:",
        err
      );
      setPurchaseCount(0);
    } finally {
      setLoading(false);
      setConfirmOpen(true);
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
      setConfirmOpen(false);
      onOpenChange(false);
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  function buildDeleteDescription(): string {
    const name = sponsor?.name ?? "this sponsor";
    if (purchaseCount === 0) {
      // Aria §C2 — zero linked records
      return `Moving ${name} to Trash removes it from the active list. You can restore it from Admin → Trash.`;
    }
    if (purchaseCount === 1) {
      // Aria §C1 singular
      return `1 sponsorship purchase references this sponsor. Moving ${name} to Trash keeps that record intact — it'll display "Deleted sponsor" where the name appeared.`;
    }
    // Aria §C1 plural (count >= 2)
    return `${purchaseCount} sponsorship purchases reference this sponsor. Moving ${name} to Trash keeps those records intact — they'll display "Deleted sponsor" where the name appeared.`;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-[560px] flex flex-col max-h-[90vh] overflow-hidden p-0"
          showCloseButton={false}
        >
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {(mode === "create" || contactsLoaded) ? (
              <SponsorForm
                key={sponsor?.id}
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
            <DialogFooter className="px-6 py-4 border-t border-border/60 shrink-0 flex flex-row items-center justify-between">
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={handleDeleteClick}
                disabled={loading}
              >
                Move to Trash
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {`Delete ${sponsor?.name ?? "this sponsor"}?`}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {buildDeleteDescription()}
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirmed}
              disabled={loading}
            >
              {loading ? "Moving…" : "Move to Trash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
