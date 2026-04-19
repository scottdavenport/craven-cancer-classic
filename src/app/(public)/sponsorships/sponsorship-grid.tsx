"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { SponsorshipItem } from "@/types/database";

interface SponsorshipGridProps {
  items: SponsorshipItem[];
}

export function SponsorshipGrid({ items }: SponsorshipGridProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="space-y-12">
      {/* Package grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const soldOut =
            item.max_quantity !== null && item.sold_count >= item.max_quantity;
          const availabilityPct =
            item.max_quantity && item.max_quantity > 0
              ? Math.min((item.sold_count / item.max_quantity) * 100, 100)
              : 0;

          return (
            <Card
              key={item.id}
              className={`relative shadow-sm border border-border/60 transition-[box-shadow,transform] duration-200 ${
                soldOut
                  ? "opacity-60"
                  : "hover:shadow-md hover:-translate-y-0.5"
              } ${selectedId === item.id ? "ring-2 ring-primary" : ""}`}
            >
              {soldOut && (
                <div className="absolute right-3 top-3 bg-neutral-100 text-neutral-600 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] px-2 py-0.5 rounded-sm">
                  Sold Out
                </div>
              )}
              <CardContent className="pt-6">
                <p className="font-display text-3xl font-bold text-foreground">
                  ${(item.price_cents / 100).toLocaleString()}
                </p>
                <h3 className="mt-2 font-display text-[1.25rem] font-[500] text-foreground">
                  {item.name}
                </h3>
                {item.description && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                )}
                {item.max_quantity && item.max_quantity > 0 && (
                  <div className="mt-3">
                    <p className="font-sans text-[0.75rem] text-muted-foreground/70">
                      {item.max_quantity - item.sold_count} of{" "}
                      {item.max_quantity} available
                    </p>
                    <div className="mt-1 w-full h-0.5 bg-border/40 rounded-full">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${availabilityPct}%` }}
                      />
                    </div>
                  </div>
                )}
                <Button
                  className={`mt-4 w-full bg-purple text-sm uppercase tracking-wider text-purple-foreground hover:bg-purple-hover ${soldOut ? "pointer-events-none" : ""}`}
                  disabled={soldOut}
                  onClick={() =>
                    setSelectedId(selectedId === item.id ? null : item.id)
                  }
                >
                  {soldOut
                    ? "Sold Out"
                    : selectedId === item.id
                      ? "Selected"
                      : "Select"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Purchase form */}
      {selectedId && (
        <PurchaseForm
          item={items.find((i) => i.id === selectedId)!}
          onCancel={() => setSelectedId(null)}
        />
      )}
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
  const [error, setError] = useState<string | null>(null);

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
        setError(data.error || "Something went wrong");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('[SponsorshipGrid] checkout fetch failed:', err);
      setError("Failed to process. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border/60 bg-neutral-50 shadow-sm p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-xl font-semibold">
            {item.name}
          </h3>
          <p className="text-2xl font-bold text-primary">
            ${(item.price_cents / 100).toLocaleString()}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

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
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-purple text-sm uppercase tracking-wider text-purple-foreground hover:bg-purple-hover sm:w-auto"
        >
          {loading ? "Processing..." : "Proceed to Payment"}
        </Button>
      </form>
    </div>
  );
}
