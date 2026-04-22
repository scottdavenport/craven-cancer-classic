"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SeekingTeamForm() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const data = new FormData(form);

    const payload = {
      full_name: String(data.get("full_name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      phone: String(data.get("phone") ?? "").trim() || undefined,
      type: "player",
      notes: "seeking a team — 2026",
    };

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        setError(json.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error("[SeekingTeamForm] fetch error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div
        role="status"
        className="rounded-lg border border-primary/20 bg-primary/5 px-6 py-8 text-center"
      >
        <p className="font-display text-lg font-semibold text-foreground">
          We&apos;ll reach out when we find a team for you.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-primary/40 text-sm uppercase tracking-wider text-primary hover:border-primary hover:bg-primary/5"
      >
        I&apos;m looking for a team
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="seeking_full_name">Your Name</Label>
          <Input
            id="seeking_full_name"
            name="full_name"
            autoComplete="name"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="seeking_email">Email Address</Label>
          <Input
            id="seeking_email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="seeking_phone">
            Phone{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="seeking_phone"
            name="phone"
            type="tel"
            autoComplete="tel"
          />
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/20"
        >
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={loading}
          className="bg-primary px-8 text-sm uppercase tracking-wider text-primary-foreground hover:bg-secondary"
        >
          {loading ? "Submitting..." : "Submit"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen(false)}
          className="text-sm text-muted-foreground"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
