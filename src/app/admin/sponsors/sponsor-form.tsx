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
import { isPossiblePhoneNumber } from "libphonenumber-js/min";
import {
  normalizePhone,
  formatPhoneForDisplay,
  isValidEmail,
} from "@/lib/contacts/contact-utils";

// Use isPossiblePhoneNumber so 555-area test numbers pass while "123" is rejected.
function isSponsorPhoneValid(raw: string): boolean {
  if (!raw.trim()) return true;
  return isPossiblePhoneNumber(raw.trim(), "US");
}
import type { Sponsor } from "@/types/database";

export interface SponsorshipItemOption {
  id: string;
  name: string;
  price_cents: number;
  year: number;
}

interface SponsorFormProps {
  defaultValues?: Partial<Sponsor>;
  sponsorshipItems: SponsorshipItemOption[];
  onSubmit: (formData: FormData) => void | Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function SponsorForm({
  defaultValues,
  sponsorshipItems,
  onSubmit,
  onCancel,
  loading,
}: SponsorFormProps) {
  const [tierId, setTierId] = useState(defaultValues?.tier_id ?? "");
  const [paymentStatus, setPaymentStatus] = useState(
    defaultValues?.payment_status ?? "pending"
  );

  const [phone, setPhone] = useState(
    defaultValues?.contact_phone
      ? formatPhoneForDisplay(defaultValues.contact_phone)
      : ""
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
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
    const emailValue = (form.elements.namedItem("contact_email") as HTMLInputElement)?.value ?? "";
    const nameValid = nameValue.trim().length > 0;
    const emailValid = isValidEmail(emailValue);
    const phoneValid = isSponsorPhoneValid(phone);

    if (!nameValid) setNameError("Sponsor name is required");
    if (!emailValid) setEmailError("Invalid email format");
    if (!phoneValid) setPhoneError("Invalid phone number");

    if (!nameValid || !emailValid || !phoneValid || fileError) return;

    const formData = new FormData(form);
    // Replace raw phone field with current controlled state
    formData.set("contact_phone", phone);
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
          <Label htmlFor="sf-contact_name">Contact Name</Label>
          <Input
            id="sf-contact_name"
            name="contact_name"
            defaultValue={defaultValues?.contact_name ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sf-contact_email">Contact Email</Label>
          <Input
            id="sf-contact_email"
            name="contact_email"
            type="text"
            defaultValue={defaultValues?.contact_email ?? ""}
            onChange={() => setEmailError(null)}
          />
          {emailError && (
            <p className="text-destructive text-sm">{emailError}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="sf-contact_phone">Contact Phone</Label>
          <Input
            id="sf-contact_phone"
            name="contact_phone"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setPhoneError(null);
            }}
            onBlur={() => {
              if (!phone) return;
              if (!isSponsorPhoneValid(phone)) {
                setPhoneError("Invalid phone number");
                return;
              }
              const normalized = normalizePhone(phone);
              setPhone(formatPhoneForDisplay(normalized ?? phone));
            }}
          />
          {phoneError && (
            <p className="text-destructive text-sm">{phoneError}</p>
          )}
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
