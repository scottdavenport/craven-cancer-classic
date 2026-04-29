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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ContactForm } from "./contact-form";
import { createContact, updateContact, deleteContact } from "./actions";
import type { ContactInput } from "./actions";
import type { Contact } from "@/types/database";

interface ContactModalProps {
  open: boolean;
  mode: "create" | "edit";
  contact: Contact | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onDelete?: (contact: Contact) => void;
}

export function ContactModal({
  open,
  mode,
  contact,
  onOpenChange,
  onSuccess,
  onDelete,
}: ContactModalProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const title =
    mode === "create"
      ? "New Contact"
      : `Edit Contact: ${contact?.full_name ?? ""}`;

  async function handleDeleteConfirmed() {
    if (!contact) return;
    const result = await deleteContact(contact.id);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Deleted — restore from Trash");
    onOpenChange(false);
    onSuccess();
  }

  async function handleSubmit(input: ContactInput) {
    const result =
      mode === "create"
        ? await createContact(input)
        : await updateContact(contact!.id, input);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(mode === "create" ? "Contact created" : "Contact updated");
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
            <ContactForm
              initial={contact ?? undefined}
              onSubmit={handleSubmit}
              onCancel={() => onOpenChange(false)}
              submitLabel={mode === "create" ? "Create" : "Save"}
            />
          </div>

          {mode === "edit" && contact && (
            <DialogFooter className="px-6 py-4 border-t border-border/60 shrink-0">
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setConfirmOpen(true)}
              >
                Delete contact
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${contact?.full_name ?? "this contact"}?`}
        description="They'll be moved to Trash and hidden from default views. You can restore from Admin → Trash later."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
      />
    </>
  );
}
