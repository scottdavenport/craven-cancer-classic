"use client";

import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

type ContactType = "player" | "sponsor" | "donor" | "volunteer" | "other";
type ShirtSize = "S" | "M" | "L" | "XL" | "2XL" | "3XL";

interface ValidityState {
  canSubmit: boolean;
  submitting: boolean;
}

interface ContactFormProps {
  initial?: Contact;
  onSubmit: (input: ContactInput) => Promise<void>;
  onValidityChange?: (state: ValidityState) => void;
}

type FieldErrors = Partial<Record<string, string>>;

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from(
  { length: CURRENT_YEAR + 1 - 2020 + 1 },
  (_, i) => 2020 + i
);

// Canonical type order — Player → Sponsor → Donor → Volunteer → Other
const TYPE_ORDER: ContactType[] = ["player", "sponsor", "donor", "volunteer", "other"];
const TYPE_LABELS: Record<ContactType, string> = {
  player: "Player",
  sponsor: "Sponsor",
  donor: "Donor",
  volunteer: "Volunteer",
  other: "Other",
};

const SHIRT_SIZES: ShirtSize[] = ["S", "M", "L", "XL", "2XL", "3XL"];
const SHIRT_SIZE_ITEMS: Record<string, string> = Object.fromEntries(
  SHIRT_SIZES.map((s) => [s, s])
);

function nullify(v: string): string | null {
  return v.trim() === "" ? null : v.trim();
}

export function ContactForm({
  initial,
  onSubmit,
  onValidityChange,
}: ContactFormProps) {
  const [salutation, setSalutation] = useState(initial?.salutation ?? "");
  const [firstName, setFirstName] = useState(initial?.first_name ?? "");
  const [lastName, setLastName] = useState(initial?.last_name ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(
    initial?.phone ? formatPhoneForDisplay(initial.phone) : ""
  );

  // Sprint 31: types[] replaces single type. Empty array = save-disabled until at least 1 checked.
  const [types, setTypes] = useState<ContactType[]>(
    Array.isArray(initial?.types) && initial.types.length > 0
      ? (initial.types as ContactType[])
      : []
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

  // Type-specific fields — preserved in state even when type is unchecked (decision #10)
  const [handicap, setHandicap] = useState(
    initial?.handicap != null ? String(initial.handicap) : ""
  );
  const [shirtSize, setShirtSize] = useState<ShirtSize | "">(
    (initial?.shirt_size as ShirtSize) ?? ""
  );
  const [showOnWall, setShowOnWall] = useState(
    initial?.show_on_wall ?? true
  );
  const [recognitionName, setRecognitionName] = useState(
    initial?.recognition_name ?? ""
  );

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Derived visibility flags
  const isPlayer = types.includes("player");
  const isVolunteer = types.includes("volunteer");
  const isDonor = types.includes("donor");
  const showShirtSize = isPlayer || isVolunteer;

  // Notify parent when submit-ability or in-flight state changes
  const hasErrors = Object.keys(errors).length > 0;
  const noTypesChecked = types.length === 0;
  useEffect(() => {
    onValidityChange?.({
      canSubmit: !hasErrors && !noTypesChecked,
      submitting,
    });
  }, [hasErrors, noTypesChecked, submitting, onValidityChange]);

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

  function toggleType(type: ContactType) {
    setTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  function validateEmail(val: string): boolean {
    if (val.trim() && !isValidEmail(val.trim())) {
      setFieldError("email", "Invalid email format");
      return false;
    }
    setFieldError("email", null);
    return true;
  }

  function validatePhone(val: string): boolean {
    if (val.trim() && !isValidPhone(val.trim())) {
      setFieldError("phone", "Invalid phone number");
      return false;
    }
    setFieldError("phone", null);
    return true;
  }

  function handlePhoneBlur() {
    const normalized = normalizePhone(phone);
    if (normalized) {
      setPhone(formatPhoneForDisplay(normalized));
    }
    validatePhone(phone);
  }

  function validateZip(val: string): boolean {
    if (val.trim() && !isValidZip(val.trim())) {
      setFieldError("zip", "ZIP must be 5 digits or 5+4 (e.g. 28562 or 28562-1234)");
      return false;
    }
    setFieldError("zip", null);
    return true;
  }

  function validateIdentity() {
    if (!firstName.trim() && !lastName.trim() && !company.trim()) {
      setFieldError("identity", "Provide a first/last name or company name");
      return false;
    }
    setFieldError("identity", null);
    return true;
  }

  function validateHandicap(val: string): boolean {
    if (val.trim() === "") {
      setFieldError("handicap", null);
      return true;
    }
    const n = Number(val);
    if (!Number.isInteger(n) || n < 0 || n > 54) {
      setFieldError("handicap", "Handicap must be a whole number from 0 to 54");
      return false;
    }
    setFieldError("handicap", null);
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const emailOk = validateEmail(email);
    const phoneOk = validatePhone(phone);
    const zipOk = validateZip(zip);
    const identityOk = validateIdentity();
    const handicapOk = isPlayer ? validateHandicap(handicap) : true;
    if (!emailOk || !phoneOk || !zipOk || !identityOk || !handicapOk) return;

    // Build handicap value: null if blank, integer if provided
    const handicapValue =
      handicap.trim() === "" ? null : Number(handicap);

    const input: ContactInput = {
      salutation: nullify(salutation),
      first_name: nullify(firstName),
      last_name: nullify(lastName),
      company: nullify(company),
      email: nullify(email),
      phone: nullify(phone),
      types,
      address1: nullify(address1),
      address2: nullify(address2),
      city: nullify(city),
      state: state.trim().toUpperCase() || null,
      zip: nullify(zip),
      marketing_consent: marketingConsent,
      notes: nullify(notes),
      year_first_seen: Number(yearFirstSeen),
      // Type-specific fields are always sent — server preserves them regardless of types array
      handicap: handicapValue,
      shirt_size: shirtSize || null,
      show_on_wall: showOnWall,
      recognition_name: nullify(recognitionName),
    };

    setSubmitting(true);
    try {
      await onSubmit(input);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form id="contact-form" onSubmit={handleSubmit} className="space-y-6 overflow-y-auto flex-1 px-1">
      {/* Identity */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Identity
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label htmlFor="cf-salutation">Salutation</Label>
            <div className="max-w-[120px]">
              <Input
                id="cf-salutation"
                value={salutation}
                onChange={(e) => setSalutation(e.target.value)}
                placeholder="Mr., Ms., Dr."
              />
            </div>
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

      {/* Types */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Types
        </h3>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {TYPE_ORDER.map((type) => (
            <div key={type} className="flex items-center gap-2">
              <Checkbox
                id={`cf-type-${type}`}
                checked={types.includes(type)}
                onCheckedChange={() => toggleType(type)}
              />
              <Label htmlFor={`cf-type-${type}`} className="cursor-pointer font-normal">
                {TYPE_LABELS[type]}
              </Label>
            </div>
          ))}
        </div>

        {/* Player section — Handicap (Player only) + Shirt Size (Player OR Volunteer) */}
        {isPlayer && (
          <div className="ml-1 mt-2 space-y-3 border-l-2 border-border/40 pl-4">
            <h4 className="text-xs font-medium text-muted-foreground">Player</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cf-handicap">Handicap</Label>
                <Input
                  id="cf-handicap"
                  type="number"
                  min={0}
                  max={54}
                  step={1}
                  value={handicap}
                  onChange={(e) => {
                    setHandicap(e.target.value);
                    setFieldError("handicap", null);
                  }}
                  onBlur={(e) => validateHandicap(e.target.value)}
                  placeholder="0–54"
                  aria-invalid={!!errors.handicap}
                />
                {errors.handicap && (
                  <p className="text-xs text-destructive">{errors.handicap}</p>
                )}
                <p className="text-xs text-muted-foreground">Whole number, 0–54. Optional.</p>
              </div>
              {/* Shirt Size rendered here only when Player is checked AND Volunteer is NOT checked */}
              {!isVolunteer && (
                <div className="space-y-1.5">
                  <Label htmlFor="cf-shirt-size">Shirt Size</Label>
                  <Select
                    value={shirtSize}
                    onValueChange={(v) => setShirtSize((v as ShirtSize) || "")}
                    items={SHIRT_SIZE_ITEMS}
                  >
                    <SelectTrigger id="cf-shirt-size" data-testid="shirt-size-select" aria-label="Shirt Size">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {SHIRT_SIZES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Shared Shirt Size — rendered once when Player+Volunteer are BOTH checked, or Volunteer alone */}
        {showShirtSize && !(isPlayer && !isVolunteer) && (
          <div className="ml-1 mt-2 space-y-3 border-l-2 border-border/40 pl-4">
            {isVolunteer && !isPlayer && (
              <h4 className="text-xs font-medium text-muted-foreground">Volunteer</h4>
            )}
            {isPlayer && isVolunteer && (
              <h4 className="text-xs font-medium text-muted-foreground">Player &amp; Volunteer</h4>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="cf-shirt-size">Shirt Size</Label>
              <Select
                value={shirtSize}
                onValueChange={(v) => setShirtSize((v as ShirtSize) || "")}
                items={SHIRT_SIZE_ITEMS}
              >
                <SelectTrigger id="cf-shirt-size" data-testid="shirt-size-select" aria-label="Shirt Size">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {SHIRT_SIZES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Donor section */}
        {isDonor && (
          <div className="ml-1 mt-2 space-y-3 border-l-2 border-border/40 pl-4">
            <h4 className="text-xs font-medium text-muted-foreground">Donor</h4>
            <div className="flex items-center gap-2">
              <Switch
                id="cf-show-on-wall"
                checked={showOnWall}
                onCheckedChange={setShowOnWall}
              />
              <Label htmlFor="cf-show-on-wall" className="cursor-pointer">
                Show name on tribute wall
              </Label>
              <Tooltip>
                <TooltipTrigger
                  type="button"
                  aria-label="What is the tribute wall?"
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                    <path
                      d="M8 7.5v3.5M8 5h.01"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </TooltipTrigger>
                <TooltipContent>
                  The tribute wall is a public page listing everyone who donated. Turn this off to record the donation without showing this person&apos;s name publicly.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-recognition-name">Recognition Name</Label>
              <Input
                id="cf-recognition-name"
                value={recognitionName}
                onChange={(e) => setRecognitionName(e.target.value)}
                placeholder="e.g. The Smith Family"
                aria-label="Recognition Name"
              />
              <p className="text-xs text-muted-foreground">
                Shown on the tribute wall. Leave blank to use full name.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Classification */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Classification
        </h3>
        <div className="space-y-1.5">
          <Label>Year First Seen</Label>
          <Select
            value={yearFirstSeen}
            onValueChange={(v) => setYearFirstSeen(v ?? String(CURRENT_YEAR))}
            items={Object.fromEntries(YEAR_OPTIONS.map((y) => [String(y), String(y)]))}
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
        <div className="flex items-center gap-2">
          <Switch
            id="cf-marketing-consent"
            checked={marketingConsent}
            onCheckedChange={setMarketingConsent}
          />
          <Label htmlFor="cf-marketing-consent" className="cursor-pointer">
            Marketing consent (subscribed to emails)
          </Label>
        </div>
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

    </form>
  );
}
