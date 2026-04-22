"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ContactType = "player" | "sponsor" | "donor" | "other";

interface ProspectCaptureFormProps {
  /** The contacts.type value to store — must be a valid CHECK value */
  contactType: ContactType;
  /** Descriptive notes prefix stored alongside any company_name */
  notesPrefix?: string;
  /** Whether to show the optional Company / Organization field */
  showCompany?: boolean;
  /** Text shown inside the success banner after submission */
  successMessage?: string;
}

export function ProspectCaptureForm({
  contactType,
  notesPrefix,
  showCompany = false,
  successMessage = "Thank you — we'll be in touch.",
}: ProspectCaptureFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const data = new FormData(form);

    const payload: Record<string, string> = {
      full_name: String(data.get("full_name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      type: contactType,
    };

    if (notesPrefix) {
      payload.notes = notesPrefix;
    }

    const company = String(data.get("company_name") ?? "").trim();
    if (company) {
      payload.company_name = company;
    }

    let res: Response | null = null;
    try {
      res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("contacts form fetch error:", err);
      setLoading(false);
      setError("Something went wrong. Please try again.");
      return;
    }

    setLoading(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({})) as { error?: string };
      setError(json.error ?? "Something went wrong. Please try again.");
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div
        role="status"
        className="rounded-lg border border-primary/20 bg-primary/5 px-6 py-8 text-center"
      >
        <p className="font-display text-lg font-semibold text-foreground">
          {successMessage}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="prospect_full_name">Your Name</Label>
          <Input
            id="prospect_full_name"
            name="full_name"
            autoComplete="name"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prospect_email">Email Address</Label>
          <Input
            id="prospect_email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        {showCompany && (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="prospect_company">
              Company / Organization{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="prospect_company"
              name="company_name"
              autoComplete="organization"
            />
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/20">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="bg-primary px-8 text-sm uppercase tracking-wider text-primary-foreground hover:bg-secondary"
      >
        {loading ? "Submitting..." : "Get Notified"}
      </Button>
    </form>
  );
}
