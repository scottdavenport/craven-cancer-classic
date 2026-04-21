"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { FileUploadField } from "@/components/ui/file-upload";
import { ContactTypeaheadMulti } from "@/components/admin/contact-typeahead";
import type { ContactPickResult } from "@/components/admin/contact-typeahead";
import type { Sponsor } from "@/types/database";

export interface SponsorshipItemOption {
  id: string;
  name: string;
  price_cents: number;
  year: number;
}

interface SponsorFormProps {
  defaultValues?: Partial<Sponsor> & { contact_ids?: string[] };
  contacts?: ContactPickResult[];
  initialContacts?: ContactPickResult[];
  sponsorshipItems: SponsorshipItemOption[];
  onSubmit: (formData: FormData) => void | Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function SponsorForm({
  defaultValues,
  contacts = [],
  initialContacts,
  sponsorshipItems,
  onSubmit,
  onCancel,
  loading,
}: SponsorFormProps) {
  const [tierId, setTierId] = useState(defaultValues?.tier_id ?? "");
  const [paymentStatus, setPaymentStatus] = useState(
    defaultValues?.payment_status ?? "pending"
  );
  const [isActive, setIsActive] = useState(
    defaultValues?.is_active !== false
  );

  const seedContacts: ContactPickResult[] = initialContacts !== undefined
    ? initialContacts
    : (defaultValues?.contact_ids ?? [])
        .map((id) => contacts.find((c) => c.id === id))
        .filter((c): c is ContactPickResult => !!c);

  const [selectedContacts, setSelectedContacts] = useState<ContactPickResult[]>(seedContacts);
  const [nameError, setNameError] = useState<string | null>(null);
  const savedLogoUrl = defaultValues?.logo_url ?? null;
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(savedLogoUrl);

  function handleLogoChange(file: File | null) {
    setFileError(null);
    if (!file) {
      setLogoFile(null);
      setPreviewUrl(savedLogoUrl);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError("File too large (max 5MB)");
      setLogoFile(null);
      setPreviewUrl(savedLogoUrl);
      return;
    }
    setLogoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const nameValue = (form.elements.namedItem("name") as HTMLInputElement)?.value ?? "";
    const nameValid = nameValue.trim().length > 0;

    if (!nameValid) setNameError("Sponsor name is required");
    if (!nameValid || fileError) return;

    const formData = new FormData(form);
    formData.set("is_active", String(isActive));
    formData.set(
      "contact_ids",
      selectedContacts.map((c) => c.id).join(",")
    );
    if (logoFile) {
      formData.set("logo", logoFile);
    }
    onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sf-name">Sponsor Name</Label>
          <Input
            id="sf-name"
            name="name"
            defaultValue={defaultValues?.name}
            required
            onChange={() => setNameError(null)}
          />
          {nameError && (
            <p className="text-destructive text-sm">{nameError}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sf-tier_id">Sponsorship level</Label>
          <input type="hidden" name="tier_id" value={tierId} />
          <Select
            value={tierId}
            onValueChange={(v) => setTierId(v ?? "")}
            items={Object.fromEntries(
              sponsorshipItems.map((item) => [
                item.id,
                `${item.name} — $${(item.price_cents / 100).toLocaleString()}`,
              ])
            )}
          >
            <SelectPrimitive.Trigger
              id="sf-tier_id"
              data-slot="select-trigger"
              className="flex w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive data-placeholder:text-muted-foreground"
            >
              <SelectValue placeholder="Select a level" />
              <SelectPrimitive.Icon render={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none size-4 text-muted-foreground" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>} />
            </SelectPrimitive.Trigger>
            <SelectContent>
              {sponsorshipItems.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name} — ${(item.price_cents / 100).toLocaleString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sf-payment_status">Payment Status</Label>
          <input type="hidden" name="payment_status" value={paymentStatus} />
          <Select
            value={paymentStatus}
            onValueChange={(v) => setPaymentStatus(v ?? "pending")}
            items={{ pending: "Pending", paid: "Paid", comped: "Comped" }}
          >
            <SelectPrimitive.Trigger
              id="sf-payment_status"
              data-slot="select-trigger"
              className="flex w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive data-placeholder:text-muted-foreground"
            >
              <SelectValue />
              <SelectPrimitive.Icon render={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none size-4 text-muted-foreground" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>} />
            </SelectPrimitive.Trigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="comped">Comped</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sf-amount_paid">Amount Paid</Label>
          <Input
            id="sf-amount_paid"
            name="amount_paid"
            type="number"
            step="0.01"
            defaultValue={
              defaultValues?.amount_paid_cents != null
                ? defaultValues.amount_paid_cents / 100
                : 0
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sf-website">Website</Label>
          <Input
            id="sf-website"
            name="website"
            type="url"
            defaultValue={defaultValues?.website ?? ""}
          />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <input type="hidden" name="is_active" value={String(isActive)} />
          <Switch
            id="sf-is_active"
            checked={isActive}
            onCheckedChange={setIsActive}
            aria-label="Active"
          />
          <Label htmlFor="sf-is_active" className="cursor-pointer select-none">
            Active
          </Label>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Contacts</Label>
          <ContactTypeaheadMulti
            label="Search contacts"
            value={selectedContacts}
            onChange={setSelectedContacts}
          />
          <p className="text-xs text-muted-foreground">
            Link contacts to this sponsor to track who the company or individual representative is.
          </p>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <FileUploadField
            label="Logo"
            name="logo"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            value={logoFile}
            onChange={handleLogoChange}
            error={fileError ?? undefined}
            helpText={fileError ? undefined : "PNG, JPG, WebP, or SVG. Max 5MB."}
          />
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Logo preview"
              className="mt-2 h-16 w-auto object-contain rounded-md border border-border/60 bg-neutral-50 p-1"
            />
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : defaultValues ? "Update" : "Create"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
