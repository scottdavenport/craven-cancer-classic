"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { searchContacts } from "@/app/admin/teams/actions";
import { createContact } from "@/app/admin/contacts/actions";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ContactPickResult = {
  id: string;
  full_name: string;
  email: string | null;
  company: string | null;
};

// ---------------------------------------------------------------------------
// Single-select ContactTypeahead
// Used by TeamForm (captain / player slots) and as the building block for
// the multi-select variant below.
// ---------------------------------------------------------------------------

interface ContactTypeaheadProps {
  label: string;
  value: ContactPickResult | null;
  onChange: (contact: ContactPickResult | null) => void;
  exclude?: string[]; // contact IDs to exclude from results
  onInlineOpenChange?: (open: boolean) => void;
}

export function ContactTypeahead({
  label,
  value,
  onChange,
  exclude = [],
  onInlineOpenChange,
}: ContactTypeaheadProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContactPickResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCreateCta, setShowCreateCta] = useState(false);
  const [inlineFormOpen, setInlineFormOpen] = useState(false);
  const [prefillFirst, setPrefillFirst] = useState("");
  const [prefillLast, setPrefillLast] = useState("");
  const [formFirst, setFormFirst] = useState("");
  const [formLast, setFormLast] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setOpen(false);
        setShowCreateCta(false);
        return;
      }
      setLoading(true);
      try {
        const data = await searchContacts(q);
        const filtered = data.filter((c) => !exclude.includes(c.id));
        setResults(filtered.slice(0, 20));
        if (filtered.length > 0) {
          setOpen(true);
          setShowCreateCta(false);
        } else {
          setOpen(false);
          setShowCreateCta(true);
        }
      } catch (err) {
        console.error("[ContactTypeahead] searchContacts failed:", err);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exclude.join(",")]
  );

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    setShowCreateCta(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(q), 200);
  }

  function handleSelect(contact: ContactPickResult) {
    onChange(contact);
    setQuery("");
    setResults([]);
    setOpen(false);
    setShowCreateCta(false);
  }

  function handleClear() {
    onChange(null);
    setQuery("");
    setResults([]);
    setOpen(false);
    setShowCreateCta(false);
  }

  function handleOpenCreateForm() {
    const trimmed = query.trim();
    const spaceIdx = trimmed.indexOf(" ");
    let first = trimmed;
    let last = "";
    if (spaceIdx !== -1) {
      first = trimmed.slice(0, spaceIdx).trim();
      last = trimmed.slice(spaceIdx + 1).trim();
    }
    setPrefillFirst(first);
    setPrefillLast(last);
    setFormFirst(first);
    setFormLast(last);
    setFormEmail("");
    setFormPhone("");
    setFormError(null);
    setInlineFormOpen(true);
    setShowCreateCta(false);
    setOpen(false);
    onInlineOpenChange?.(true);
  }

  function handleCancelCreate() {
    setInlineFormOpen(false);
    onInlineOpenChange?.(false);
    setFormError(null);
    setPrefillFirst("");
    setPrefillLast("");
    setFormFirst("");
    setFormLast("");
    setFormEmail("");
    setFormPhone("");
  }

  async function handleCreateSubmit(e: React.FormEvent | React.MouseEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);
    try {
      const result = await createContact({
        salutation: null,
        first_name: formFirst.trim() || null,
        last_name: formLast.trim() || null,
        company: null,
        email: formEmail.trim() || null,
        phone: formPhone.trim() || null,
        types: ["player"],
        address1: null,
        address2: null,
        city: null,
        state: null,
        zip: null,
        marketing_consent: false,
        notes: null,
        year_first_seen: new Date().getFullYear(),
      });
      if ("error" in result) {
        setFormError(result.error);
        return;
      }
      const parts = [formFirst.trim(), formLast.trim()].filter(Boolean);
      const full_name = parts.length > 0 ? parts.join(" ") : "Unknown";
      const newContact: ContactPickResult = {
        id: result.id,
        full_name,
        email: formEmail.trim() || null,
        company: null,
      };
      onChange(newContact);
      setInlineFormOpen(false);
      onInlineOpenChange?.(false);
      setQuery("");
      setResults([]);
      setFormFirst("");
      setFormLast("");
      setFormEmail("");
      setFormPhone("");
      setFormError(null);
    } catch (err) {
      console.error("[ContactTypeahead] createContact failed:", err);
      setFormError("An unexpected error occurred. Please try again.");
    } finally {
      setFormSubmitting(false);
    }
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // suppress unused-variable warning — drive initial form state only
  void prefillFirst;
  void prefillLast;

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <Label>{label}</Label>

      {value ? (
        <div className="flex items-center gap-2 rounded-lg border border-input bg-neutral-50 px-3 py-2 text-sm">
          <span className="flex-1 font-medium text-foreground">{value.full_name}</span>
          {value.company && (
            <span className="text-muted-foreground text-xs">{value.company}</span>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="ml-1 rounded-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Remove ${value.full_name}`}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          {!inlineFormOpen && (
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={query}
              onChange={handleQueryChange}
              onFocus={() => query.trim() && results.length > 0 && setOpen(true)}
              autoComplete="off"
            />
          )}
          {loading && !inlineFormOpen && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              Searching...
            </span>
          )}
          {open && results.length > 0 && !inlineFormOpen && (
            <ul className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-md overflow-y-auto max-h-52 text-sm">
              {results.map((contact) => (
                <li key={contact.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground flex items-center justify-between gap-2 transition-colors"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(contact);
                    }}
                  >
                    <span className="font-medium">{contact.full_name}</span>
                    {contact.company && (
                      <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                        {contact.company}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {showCreateCta && !inlineFormOpen && (
            <div className="mt-1 rounded-lg border border-border bg-popover shadow-md text-sm">
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-teal-700 hover:bg-teal-50 transition-colors rounded-lg font-medium"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleOpenCreateForm();
                }}
              >
                + Create &apos;{query.trim()}&apos; as a new contact
              </button>
            </div>
          )}
          {inlineFormOpen && (
            <div className="rounded-xl border border-border bg-neutral-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">New Contact</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor={`inline-first-${label}`}>First Name</Label>
                  <Input
                    id={`inline-first-${label}`}
                    type="text"
                    value={formFirst}
                    onChange={(e) => setFormFirst(e.target.value)}
                    placeholder="First"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`inline-last-${label}`}>Last Name</Label>
                  <Input
                    id={`inline-last-${label}`}
                    type="text"
                    value={formLast}
                    onChange={(e) => setFormLast(e.target.value)}
                    placeholder="Last"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`inline-email-${label}`}>Email</Label>
                <Input
                  id={`inline-email-${label}`}
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="email@example.com"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`inline-phone-${label}`}>Phone (optional)</Label>
                <Input
                  id={`inline-phone-${label}`}
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                  autoComplete="off"
                />
              </div>
              {formError && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  {formError}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  disabled={formSubmitting}
                  onClick={handleCreateSubmit}
                >
                  {formSubmitting ? "Saving..." : "Create Contact"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={formSubmitting}
                  onClick={handleCancelCreate}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Multi-select ContactTypeaheadMulti
// Used by SponsorForm — tracks a list of selected contacts as pill chips.
// ---------------------------------------------------------------------------

interface ContactTypeaheadMultiProps {
  label: string;
  value: ContactPickResult[];
  onChange: (contacts: ContactPickResult[]) => void;
}

export function ContactTypeaheadMulti({
  label,
  value,
  onChange,
}: ContactTypeaheadMultiProps) {
  const selectedIds = value.map((c) => c.id);

  function handleAdd(contact: ContactPickResult) {
    if (selectedIds.includes(contact.id)) return;
    onChange([...value, contact]);
  }

  function handleRemove(id: string) {
    onChange(value.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-2">
      {/* Pill chips for already-selected contacts */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((contact) => (
            <span
              key={contact.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-input bg-neutral-50 px-3 py-1 text-sm font-medium"
            >
              {contact.full_name}
              <button
                type="button"
                onClick={() => handleRemove(contact.id)}
                className="rounded-full text-muted-foreground hover:text-foreground transition-colors"
                aria-label={`Remove ${contact.full_name}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {/* Single-select typeahead — exclude already-selected */}
      <ContactTypeahead
        label={value.length === 0 ? label : "Add another contact"}
        value={null}
        onChange={(c) => { if (c) handleAdd(c); }}
        exclude={selectedIds}
      />
    </div>
  );
}
