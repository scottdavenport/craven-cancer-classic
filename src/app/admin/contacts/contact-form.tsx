"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  isValidEmail,
  isValidPhone,
  isValidZip,
  normalizePhone,
  formatPhoneForDisplay,
} from "@/lib/contacts/contact-utils";
import type { ContactInput } from "./actions";
import type { Contact } from "@/types/database";

interface ContactFormProps {
  initial?: Contact;
  onSubmit: (input: ContactInput) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

type FieldErrors = Partial<Record<string, string>>;

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from(
  { length: CURRENT_YEAR + 1 - 2020 + 1 },
  (_, i) => 2020 + i
);

function nullify(v: string): string | null {
  return v.trim() === "" ? null : v.trim();
}

export function ContactForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Save",
}: ContactFormProps) {
  const [salutation, setSalutation] = useState(initial?.salutation ?? "");
  const [firstName, setFirstName] = useState(initial?.first_name ?? "");
  const [lastName, setLastName] = useState(initial?.last_name ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(
    initial?.phone ? formatPhoneForDisplay(initial.phone) : ""
  );
  const [type, setType] = useState<ContactInput["type"]>(
    (initial?.type as ContactInput["type"]) ?? "player"
  );
  const [marketingConsent, setMarketingConsent] = useState(
    initial?.marketing_consent ?? false
  );
  const [yearFirstSeen, setYearFirstSeen] = useState(
    String(initial?.year_first_seen ?? CURRENT_YEAR)
  );
  const [address1, setAddress1] = useState(initial?.address1 ?? "");
  const [address2, setAddress2] = useState(initial?.address2 ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [state, setState] = useState(initial?.state ?? "");
  const [zip, setZip] = useState(initial?.zip ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function setFieldError(field: string, msg: string | null) {
    setErrors((prev) => {
      const next = { ...prev };
      if (msg === null) {
        delete next[field];
      } else {
        next[field] = msg;
      }
      return next;
    });
  }

  function validateEmail(val: string) {
    if (val.trim() && !isValidEmail(val.trim())) {
      setFieldError("email", "Invalid email format");
    } else {
      setFieldError("email", null);
    }
  }

  function validatePhone(val: string) {
    if (val.trim() && !isValidPhone(val.trim())) {
      setFieldError("phone", "Invalid phone number");
    } else {
      setFieldError("phone", null);
    }
  }

  function handlePhoneBlur() {
    const normalized = normalizePhone(phone);
    if (normalized) {
      setPhone(formatPhoneForDisplay(normalized));
    }
    validatePhone(phone);
  }

  function validateZip(val: string) {
    if (val.trim() && !isValidZip(val.trim())) {
      setFieldError("zip", "ZIP must be 5 digits or 5+4 (e.g. 28562 or 28562-1234)");
    } else {
      setFieldError("zip", null);
    }
  }

  function validateIdentity() {
    if (!firstName.trim() && !lastName.trim() && !company.trim()) {
      setFieldError("identity", "Provide a first/last name or company name");
      return false;
    }
    setFieldError("identity", null);
    return true;
  }

  const hasErrors = Object.keys(errors).length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Re-run all validations before submit
    validateEmail(email);
    validatePhone(phone);
    validateZip(zip);
    const identityOk = validateIdentity();
    if (!identityOk || hasErrors) return;

    const input: ContactInput = {
      salutation: nullify(salutation),
      first_name: nullify(firstName),
      last_name: nullify(lastName),
      company: nullify(company),
      email: nullify(email),
      phone: nullify(phone),
      type,
      address1: nullify(address1),
      address2: nullify(address2),
      city: nullify(city),
      state: state.trim().toUpperCase() || null,
      zip: nullify(zip),
      marketing_consent: marketingConsent,
      notes: nullify(notes),
      year_first_seen: Number(yearFirstSeen),
    };

    setSubmitting(true);
    try {
      await onSubmit(input);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto flex-1 px-1">
      {/* Identity */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Identity
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label htmlFor="cf-salutation">Salutation</Label>
            <Input
              id="cf-salutation"
              value={salutation}
              onChange={(e) => setSalutation(e.target.value)}
              placeholder="Mr., Ms., Dr."
            />
          </div>
          <div className="col-span-2 sm:col-span-1" />
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label htmlFor="cf-first-name">First Name</Label>
            <Input
              id="cf-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onBlur={validateIdentity}
              placeholder="Jane"
            />
          </div>
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label htmlFor="cf-last-name">Last Name</Label>
            <Input
              id="cf-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onBlur={validateIdentity}
              placeholder="Smith"
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="cf-company">Company</Label>
            <Input
              id="cf-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onBlur={validateIdentity}
              placeholder="Acme Corp"
            />
          </div>
        </div>
        {errors.identity && (
          <p className="text-xs text-destructive">{errors.identity}</p>
        )}
      </div>

      {/* Contact */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Contact
        </h3>
        <div className="space-y-1.5">
          <Label htmlFor="cf-email">Email</Label>
          <Input
            id="cf-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={(e) => validateEmail(e.target.value)}
            placeholder="jane@example.com"
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cf-phone">Phone</Label>
          <Input
            id="cf-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={handlePhoneBlur}
            placeholder="(919) 555-0100"
            aria-invalid={!!errors.phone}
          />
          {errors.phone && (
            <p className="text-xs text-destructive">{errors.phone}</p>
          )}
        </div>
      </div>

      {/* Classification */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Classification
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ContactInput["type"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="player">Player</SelectItem>
                <SelectItem value="sponsor">Sponsor</SelectItem>
                <SelectItem value="donor">Donor</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label>Year First Seen</Label>
            <Select
              value={yearFirstSeen}
              onValueChange={(v) => setYearFirstSeen(v ?? String(CURRENT_YEAR))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={marketingConsent}
            onChange={(e) => setMarketingConsent(e.target.checked)}
            className="accent-brand h-4 w-4 rounded"
          />
          Marketing consent (subscribed to emails)
        </label>
      </div>

      {/* Address */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Address
        </h3>
        <div className="space-y-1.5">
          <Label htmlFor="cf-address1">Address Line 1</Label>
          <Input
            id="cf-address1"
            value={address1}
            onChange={(e) => setAddress1(e.target.value)}
            placeholder="123 Main St"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cf-address2">Address Line 2</Label>
          <Input
            id="cf-address2"
            value={address2}
            onChange={(e) => setAddress2(e.target.value)}
            placeholder="Suite 100"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5 col-span-3 sm:col-span-1">
            <Label htmlFor="cf-city">City</Label>
            <Input
              id="cf-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="New Bern"
            />
          </div>
          <div className="space-y-1.5 col-span-1">
            <Label htmlFor="cf-state">State</Label>
            <Input
              id="cf-state"
              value={state}
              onChange={(e) => setState(e.target.value.slice(0, 2).toUpperCase())}
              placeholder="NC"
              maxLength={2}
            />
          </div>
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label htmlFor="cf-zip">ZIP</Label>
            <Input
              id="cf-zip"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              onBlur={(e) => validateZip(e.target.value)}
              placeholder="28562"
              aria-invalid={!!errors.zip}
            />
            {errors.zip && (
              <p className="text-xs text-destructive">{errors.zip}</p>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Notes
        </h3>
        <Textarea
          id="cf-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any relevant notes..."
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 pb-4">
        <Button type="submit" disabled={submitting || hasErrors}>
          {submitting ? "Saving..." : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
