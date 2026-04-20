"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  sponsorshipItems: SponsorshipItemOption[];
  onSubmit: (formData: FormData) => void | Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function SponsorForm({
  defaultValues,
  contacts = [],
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
    // default to true unless explicitly set to false
    defaultValues?.is_active !== false
  );

  // Pre-populate contact picker from passed contacts prop + defaultValues.contact_ids
  const initialContacts: ContactPickResult[] = (defaultValues?.contact_ids ?? [])
    .map((id) => contacts.find((c) => c.id === id))
    .filter((c): c is ContactPickResult => !!c);

  const [selectedContacts, setSelectedContacts] = useState<ContactPickResult[]>(initialContacts);
  const [nameError, setNameError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileError(null);
    setPreviewUrl(null);
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setFileError("File too large (max 5MB)");
      return;
    }
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
    // Inject controlled fields not covered by native form serialization
    formData.set("is_active", String(isActive));
    formData.set(
      "contact_ids",
      selectedContacts.map((c) => c.id).join(",")
    );
    onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
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
        <div className="space-y-2">
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
            <SelectTrigger id="sf-tier_id" className="w-full h-8">
              <SelectValue placeholder="Select a level" />
            </SelectTrigger>
            <SelectContent>
              {sponsorshipItems.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name} — ${(item.price_cents / 100).toLocaleString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sf-payment_status">Payment Status</Label>
          <input type="hidden" name="payment_status" value={paymentStatus} />
          <Select
            value={paymentStatus}
            onValueChange={(v) => setPaymentStatus(v ?? "pending")}
            items={{ pending: "Pending", paid: "Paid", comped: "Comped" }}
          >
            <SelectTrigger id="sf-payment_status" className="w-full h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="comped">Comped</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
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
        <div className="space-y-2">
          <Label htmlFor="sf-website">Website</Label>
          <Input
            id="sf-website"
            name="website"
            type="url"
            defaultValue={defaultValues?.website ?? ""}
          />
        </div>
        <div className="flex items-center gap-3 pt-6">
          {/* is_active toggle — checkbox driven by controlled state; hidden input carries the value */}
          <input type="hidden" name="is_active" value={String(isActive)} />
          <input
            id="sf-is_active"
            type="checkbox"
            role="switch"
            aria-checked={isActive}
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 cursor-pointer accent-teal-600"
            aria-label="Active"
          />
          <Label htmlFor="sf-is_active" className="cursor-pointer select-none">
            Active
          </Label>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Contacts</Label>
          <ContactTypeaheadMulti
            label="Search contacts"
            value={selectedContacts}
            onChange={setSelectedContacts}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="sf-logo">Logo</Label>
          <input
            id="sf-logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={handleFileChange}
          />
          {fileError && (
            <p className="text-destructive text-sm">{fileError}</p>
          )}
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Logo preview"
              className="mt-2 h-16 w-auto object-contain"
            />
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Saving..." : defaultValues ? "Update" : "Create"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
