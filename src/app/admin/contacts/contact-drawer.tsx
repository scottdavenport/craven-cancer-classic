"use client";

import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ContactForm } from "./contact-form";
import { createContact, updateContact } from "./actions";
import type { ContactInput } from "./actions";
import type { Contact } from "@/types/database";

interface ContactDrawerProps {
  open: boolean;
  mode: "create" | "edit";
  contact: Contact | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onDelete?: (contact: Contact) => void;
}

export function ContactDrawer({
  open,
  mode,
  contact,
  onOpenChange,
  onSuccess,
  onDelete,
}: ContactDrawerProps) {
  const title =
    mode === "create"
      ? "New Contact"
      : `Edit Contact: ${contact?.full_name ?? ""}`;

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
          <ContactForm
            initial={contact ?? undefined}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            submitLabel={mode === "create" ? "Create" : "Save"}
          />
        </div>

        {mode === "edit" && contact && onDelete && (
          <SheetFooter className="px-6 py-4 border-t border-border/60 shrink-0">
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => onDelete(contact)}
            >
              Delete contact
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
