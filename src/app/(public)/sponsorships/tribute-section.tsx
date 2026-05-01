"use client";

/**
 * TributeSection — Sprint 33 Phase 2 (#306)
 *
 * Renders the Tributes section of /sponsorships.
 * Each tribute item shows a card; clicking opens an inline buy form
 * with the "In honor of" (tribute_recipient) field required.
 *
 * Phase 3 (#307) will import this into the page layout.
 * Phase 3 (#307) will also extend this file with the Recently Honored list.
 *
 * Copy: placeholder — Aria #308 finalizes all strings.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SponsorshipItem } from "@/types/database";
import { CONTACT_EMAIL, CONTACT_EMAIL_MAILTO } from "@/lib/contact";

// TributeItem is a SponsorshipItem with category === "tribute".
// Re-exported as a named alias so callers can be explicit.
export type TributeItem = SponsorshipItem;

function formatPrice(cents: number): string {
  const dollars = cents / 100;
  if (Number.isInteger(dollars)) {
    return `$${dollars.toLocaleString("en-US")}`;
  }
  return `$${dollars.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface TributeSectionProps {
  items: TributeItem[];
}

export function TributeSection({ items }: TributeSectionProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedItem = selectedId
    ? items.find((i) => i.id === selectedId) ?? null
    : null;

  if (items.length === 0) {
    return null;
  }

  return (
    <section data-testid="section-tributes" data-section-type="tribute">
      {/* Section header — placeholder copy; Aria #308 finalizes */}
      <div className="mb-8 text-center">
        <h2
          style={{
            fontFamily: "var(--font-manrope)",
            fontWeight: 800,
            fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.015em",
            color: "var(--foreground)",
          }}
        >
          Tributes — Honor a loved one
        </h2>
        <p className="mt-3 mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
          Celebrate someone fighting cancer or honor their memory by adding a
          tribute to the tournament. Every tribute is recognized at the event.
        </p>
      </div>

      {/* Item cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <TributeCard
            key={item.id}
            item={item}
            onSelect={(id) => setSelectedId(id)}
          />
        ))}
      </div>

      {/* Purchase modal */}
      <Dialog
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton={false}>
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedItem.name} ·{" "}
                  {formatPrice(selectedItem.price_cents)}
                </DialogTitle>
              </DialogHeader>
              <TributePurchaseForm
                item={selectedItem}
                onCancel={() => setSelectedId(null)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ---------------------------------------------------------------------------
// TributeCard
// ---------------------------------------------------------------------------

interface TributeCardProps {
  item: TributeItem;
  onSelect: (id: string) => void;
}

function TributeCard({ item, onSelect }: TributeCardProps) {
  return (
    <div
      data-testid={`tribute-card-${item.id}`}
      className={[
        "relative flex flex-col rounded-lg border border-border/60 bg-white p-6 shadow-sm",
        "transition-[transform,box-shadow] duration-200",
        "hover:-translate-y-px",
      ].join(" ")}
    >
      {/* Price */}
      <p
        className="font-sans text-3xl font-extrabold text-foreground"
        style={{ fontFamily: "var(--font-manrope)" }}
      >
        {formatPrice(item.price_cents)}
      </p>

      {/* Name */}
      <h3
        className="mt-2 font-sans text-[1.125rem] font-semibold text-foreground"
        style={{ fontFamily: "var(--font-manrope)" }}
      >
        {item.name}
      </h3>

      {/* Description — placeholder; Aria #308 refines */}
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {item.description ??
          "Add a tribute to honor a loved one."}
      </p>

      {/* CTA */}
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        className="mt-5 w-full rounded-md px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white transition-colors duration-150 bg-brand-darker hover:bg-brand"
      >
        Add tribute →
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TributePurchaseForm
// ---------------------------------------------------------------------------

interface TributePurchaseFormProps {
  item: TributeItem;
  onCancel: () => void;
}

function TributePurchaseForm({ item, onCancel }: TributePurchaseFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<React.ReactNode>(null);
  const [tributeRecipient, setTributeRecipient] = useState("");

  const recipientBlank = tributeRecipient.trim() === "";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (recipientBlank) return;

    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sponsorship",
          item_id: item.id,
          purchaser_name: formData.get("purchaser_name"),
          purchaser_email: formData.get("purchaser_email"),
          purchaser_phone: formData.get("purchaser_phone"),
          tribute_recipient: tributeRecipient.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error || (
            <>
              {"Tribute didn't go through. Email "}
              <a
                href={CONTACT_EMAIL_MAILTO}
                className="underline underline-offset-4 hover:no-underline"
              >
                {CONTACT_EMAIL}
              </a>
              {" if this keeps happening."}
            </>
          )
        );
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("[TributeSection] checkout fetch failed:", err);
      setError("Failed to process. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && (
        <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {/* In honor of — required, validated client-side */}
        <div className="space-y-2">
          <Label htmlFor="tribute_recipient">
            In honor of <span aria-hidden="true" className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">
            We&rsquo;ll print this name on the balloon at the event.
          </p>
          <Input
            id="tribute_recipient"
            name="tribute_recipient"
            required
            value={tributeRecipient}
            onChange={(e) => setTributeRecipient(e.target.value)}
            placeholder="Name of the person you're honoring"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="purchaser_name">Your Name</Label>
            <Input id="purchaser_name" name="purchaser_name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchaser_email">Email</Label>
            <Input
              id="purchaser_email"
              name="purchaser_email"
              type="email"
              required
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="purchaser_phone">Phone (optional)</Label>
            <Input id="purchaser_phone" name="purchaser_phone" type="tel" />
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={loading || recipientBlank}
            className="flex-1 bg-brand-darker text-sm uppercase tracking-wider text-white hover:bg-brand sm:flex-none"
          >
            {loading ? "Processing..." : "Proceed to Payment"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
