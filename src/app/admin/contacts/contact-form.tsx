"use client";

import { useState, useEffect } from "react";
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
import { ModalSection } from "@/components/admin/modal-section";
import { Goal, Briefcase, Heart, Users, HelpCircle } from "lucide-react";
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

// Canonical type order — Player → Sponsor → Donor → Volunteer → Other
const TYPE_ORDER: ContactType[] = ["player", "sponsor", "donor", "volunteer", "other"];
const TYPE_LABELS: Record<ContactType, string> = {
  player: "Player",
  sponsor: "Sponsor",
  donor: "Donor",
  volunteer: "Volunteer",
  other: "Other",
};

// Role card icon components
const ROLE_ICONS: Record<ContactType, React.ElementType> = {
  player: Goal,
  sponsor: Briefcase,
  donor: Heart,
  volunteer: Users,
  other: HelpCircle,
};

// Role card summary hints
const ROLE_SUMMARIES: Record<ContactType, string> = {
  player: "Handicap · Shirt size",
  sponsor: "Recognition",
  donor: "Tribute · Recognition",
  volunteer: "Shirt size",
  other: "Notes",
};

const SHIRT_SIZES: ShirtSize[] = ["S", "M", "L", "XL", "2XL", "3XL"];
const SHIRT_SIZE_ITEMS: Record<string, string> = Object.fromEntries(
  SHIRT_SIZES.map((s) => [s, s])
);

// Aria-locked salutation options (Phase 3 §A8)
const SALUTATION_OPTIONS = ["Mr.", "Mrs.", "Ms.", "Mx.", "Dr.", "Miss"];

function nullify(v: string): string | null {
  return v.trim() === "" ? null : v.trim();
}

interface RoleCardProps {
  type: ContactType;
  isOn: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

function RoleCard({ type, isOn, onToggle, children }: RoleCardProps) {
  const Icon = ROLE_ICONS[type];
  const summary = ROLE_SUMMARIES[type];

  return (
    <div
      data-state={isOn ? "on" : "off"}
      className={[
        "border-[1.5px] rounded-lg py-3 px-3.5 bg-card",
        "transition-[border-color,background-color,opacity] duration-150 ease-out",
        isOn
          ? "border-brand bg-brand-muted/30"
          : "border-border opacity-55 hover:opacity-85",
      ].join(" ")}
    >
      <div className="flex items-center gap-2.5">
        {/* Toggle switch */}
        <Switch
          role="switch"
          aria-checked={isOn}
          aria-label={`Toggle ${TYPE_LABELS[type]} role`}
          checked={isOn}
          onCheckedChange={onToggle}
          className="flex-shrink-0"
        />

        {/* Role icon */}
        <span className="size-7 rounded-[var(--radius-md)] bg-brand-muted text-brand-darker inline-flex items-center justify-center flex-shrink-0">
          <Icon className="size-4" strokeWidth={2} />
        </span>

        {/* Role name */}
        <span className="text-sm font-semibold text-foreground flex-1">
          {TYPE_LABELS[type]}
        </span>

        {/* Role summary */}
        {!isOn && (
          <span className="text-xs font-medium text-muted-foreground">
            {summary}
          </span>
        )}
      </div>

      {/* Expanded fields — visible only when card is on */}
      {isOn && children && (
        <div className="mt-3 pt-3 pl-[38px] border-t border-dashed border-border transition-all duration-200 ease-out">
          {children}
        </div>
      )}
    </div>
  );
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
  const [address1, setAddress1] = useState(initial?.address1 ?? "");
  const [address2, setAddress2] = useState(initial?.address2 ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [state, setState] = useState(initial?.state ?? "");
  const [zip, setZip] = useState(initial?.zip ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  // Track whether save was attempted (for F19 message trigger)
  const [saveAttempted, setSaveAttempted] = useState(false);

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
    setTypes((prev) => {
      const next = prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type];
      if (type === "player" && !next.includes("player")) setFieldError("handicap", null);
      return next;
    });
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

    setSaveAttempted(true);

    const emailOk = validateEmail(email);
    const phoneOk = validatePhone(phone);
    const zipOk = validateZip(zip);
    const identityOk = validateIdentity();
    const handicapOk = isPlayer ? validateHandicap(handicap) : true;
    if (!emailOk || !phoneOk || !zipOk || !identityOk || !handicapOk) return;

    // F19: block if no types selected
    if (types.length === 0) return;

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
      year_first_seen: new Date().getFullYear(),
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
    <form id="contact-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-1">

      {/* Identity */}
      <ModalSection title="Identity">
        <div className="space-y-3">
          {/* F12: Salutation (1fr) + First (2fr) + Last (2fr) grid */}
          <div className="grid grid-cols-[1fr_2fr_2fr] gap-2.5">
            <div className="space-y-1.5">
              <Label htmlFor="cf-salutation">Salutation</Label>
              {/* F15: Select instead of free-text input */}
              <Select
                value={salutation}
                onValueChange={(v) => setSalutation(v == null || v === "__blank__" ? "" : v)}
                items={Object.fromEntries([
                  ["__blank__", ""],
                  ...SALUTATION_OPTIONS.map((s) => [s, s]),
                ])}
              >
                <SelectTrigger id="cf-salutation" aria-label="Salutation">
                  <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__blank__">&nbsp;</SelectItem>
                  {SALUTATION_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-first-name">First Name</Label>
              <Input
                id="cf-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onBlur={validateIdentity}
                placeholder="Jane"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-last-name">Last Name</Label>
              <Input
                id="cf-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onBlur={validateIdentity}
                placeholder="Smith"
              />
            </div>
          </div>

          {/* Company on its own row */}
          <div className="space-y-1.5">
            <Label htmlFor="cf-company">Company</Label>
            <Input
              id="cf-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onBlur={validateIdentity}
              placeholder="Acme Corp"
            />
          </div>

          {errors.identity && (
            <p className="text-xs text-destructive">{errors.identity}</p>
          )}
        </div>
      </ModalSection>

      {/* Contact */}
      <ModalSection title="Contact">
        <div className="space-y-3">
          {/* F12: Email + Phone on one row */}
          <div className="grid grid-cols-2 gap-2.5">
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

          {/* Marketing consent */}
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
      </ModalSection>

      {/* Roles — D12 role-cards */}
      <ModalSection title="Roles">
        <div className="space-y-2">
          {/* F19: inline message when save attempted with zero types */}
          {saveAttempted && types.length === 0 && (
            <p className="bg-warning/10 border-l-[3px] border-warning rounded-[var(--radius-md)] px-3.5 py-2.5 text-[12.5px] font-medium text-warning">
              At least one role is required to save.
            </p>
          )}

          {/* Player card */}
          <RoleCard type="player" isOn={isPlayer} onToggle={() => toggleType("player")}>
            <div className="space-y-3">
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
                {/* Shirt size for player (when not also volunteer — avoid duplicate) */}
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
          </RoleCard>

          {/* Sponsor card */}
          <RoleCard type="sponsor" isOn={types.includes("sponsor")} onToggle={() => toggleType("sponsor")}>
            <div className="space-y-1.5">
              <Label htmlFor="cf-recognition-name-sponsor">Recognition Name</Label>
              <Input
                id="cf-recognition-name-sponsor"
                value={recognitionName}
                onChange={(e) => setRecognitionName(e.target.value)}
                placeholder="e.g. The Smith Family"
                aria-label="Recognition Name"
              />
              <p className="text-xs text-muted-foreground">
                Shown publicly. Leave blank to use full name.
              </p>
            </div>
          </RoleCard>

          {/* Donor card */}
          <RoleCard type="donor" isOn={isDonor} onToggle={() => toggleType("donor")}>
            <div className="space-y-3">
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
          </RoleCard>

          {/* Volunteer card */}
          <RoleCard type="volunteer" isOn={isVolunteer} onToggle={() => toggleType("volunteer")}>
            <div className="space-y-1.5">
              <Label htmlFor="cf-shirt-size-volunteer">Shirt Size</Label>
              <Select
                value={shirtSize}
                onValueChange={(v) => setShirtSize((v as ShirtSize) || "")}
                items={SHIRT_SIZE_ITEMS}
              >
                <SelectTrigger id="cf-shirt-size-volunteer" data-testid="shirt-size-select" aria-label="Shirt Size">
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
          </RoleCard>

          {/* Other card */}
          <RoleCard type="other" isOn={types.includes("other")} onToggle={() => toggleType("other")}>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <p className="text-xs text-muted-foreground">
                Use the Notes section below for additional context.
              </p>
            </div>
          </RoleCard>
        </div>
      </ModalSection>

      {/* Address */}
      <ModalSection title="Address">
        <div className="space-y-3">
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
      </ModalSection>

      {/* Notes */}
      <ModalSection title="Notes">
        <Textarea
          id="cf-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any relevant notes..."
          rows={3}
        />
      </ModalSection>

    </form>
  );
}
