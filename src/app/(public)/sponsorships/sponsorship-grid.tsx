"use client";

/**
 * SponsorshipGrid — Sprint 23 rewrite
 *
 * Client component: holds selectedId state for inline PurchaseForm.
 * Card rendering delegated to SponsorshipCard (extracted component).
 * No font-display. No bg-purple. Brand-teal CTAs.
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
import { SponsorshipCard } from "@/components/public/sponsorship-card";
import { slugifyItemName } from "@/lib/sponsorship-utils";

// One-line summaries per card slug. For items with populated benefits
// in DB, derived from the first 2-3 benefits. For the 4 with empty
// benefits (Golf Carts, Thursday Night, Morning Biscuit Sponsor,
// Shot of the Day), Aria-flagged placeholder copy — pending Aria/Scott
// sign-off before merge.
const CARD_SUMMARIES: Record<string, string> = {
  champion:
    "Premier signage at the event, recognition on the site, and 4 complimentary teams.",
  eagle:
    "Prominent signage at the event, recognition on the site, and 2 complimentary teams.",
  "golf-gift":
    "Your logo on every player's golf gift, plus recognition on the site.",
  "celebration-lunch":
    "Signage at the post-tournament awards lunch, plus recognition on the site.",
  "hole-sponsor":
    "Your signage at a tournament hole, recognized on the site.",
  "wall-sponsor":
    "Your name on the on-course sponsor wall, plus recognition on the site.",
  "golf-carts":
    "Your logo on every golf cart, plus recognition on the site.",
  "thursday-night":
    "Signage at the Thursday-night kickoff event, plus recognition on the site.",
  "morning-biscuit-sponsor":
    "Signage at the pre-tournament breakfast, plus recognition on the site.",
  "shot-of-the-day":
    "Featured at the shot-of-the-day moment, plus recognition on the site.",
  "bloody-mary-bar":
    "Signage at the morning Bloody Mary bar, plus recognition on the site.",
  "putting-contest":
    "Your brand at center stage during the putting contest.",
};

function getSummary(slug: string): string {
  return (
    CARD_SUMMARIES[slug] ?? "Recognition at the tournament and on the site."
  );
}

interface SponsorshipGridProps {
  items: SponsorshipItem[];
}

export function SponsorshipGrid({ items }: SponsorshipGridProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedItem = selectedId ? items.find((i) => i.id === selectedId) ?? null : null;

  return (
    <div>
      {/* Package grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const slug = slugifyItemName(item.name);
          const summary = getSummary(slug);
          return (
            <SponsorshipCard
              key={item.id}
              item={item}
              summary={summary}
              onSelect={(id) => setSelectedId(id)}
            />
          );
        })}
      </div>

      {/* Purchase modal */}
      <Dialog open={selectedId !== null} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <DialogContent className="sm:max-w-lg" showCloseButton={false}>
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedItem.name} · ${(selectedItem.price_cents / 100).toLocaleString()}
                </DialogTitle>
              </DialogHeader>
              <PurchaseForm
                item={selectedItem}
                onCancel={() => setSelectedId(null)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PurchaseForm({
  item,
  onCancel,
}: {
  item: SponsorshipItem;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<React.ReactNode>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
          item_name: item.name,
          price_cents: item.price_cents,
          purchaser_name: formData.get("purchaser_name"),
          purchaser_email: formData.get("purchaser_email"),
          purchaser_phone: formData.get("purchaser_phone"),
          company_name: formData.get("company_name"),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error || (
            <>
              {"Sponsorship didn't go through. Email "}
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
      console.error("[SponsorshipGrid] checkout fetch failed:", err);
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="purchaser_name">Your Name</Label>
            <Input id="purchaser_name" name="purchaser_name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_name">Company / Organization</Label>
            <Input id="company_name" name="company_name" />
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
          <div className="space-y-2">
            <Label htmlFor="purchaser_phone">Phone</Label>
            <Input id="purchaser_phone" name="purchaser_phone" type="tel" />
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={loading}
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
