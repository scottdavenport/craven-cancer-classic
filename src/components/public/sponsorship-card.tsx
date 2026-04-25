"use client";

/**
 * SponsorshipCard — Sprint 23
 *
 * Extracted presentational card for the /sponsorships Marketplace redesign.
 * Client component (receives onSelect callback).
 * No font-display. No bg-purple.
 */

import { slugifyItemName } from "@/lib/sponsorship-utils";

interface SponsorshipItem {
  id: string;
  name: string;
  price_cents: number;
  max_quantity: number | null;
  sold_count: number;
}

interface SponsorshipCardProps {
  item: SponsorshipItem;
  summary: string;
  onSelect: (id: string) => void;
}

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

export function SponsorshipCard({ item, summary, onSelect }: SponsorshipCardProps) {
  const slug = slugifyItemName(item.name);
  const soldOut =
    item.max_quantity !== null && item.sold_count >= item.max_quantity;
  const showInventoryPill = item.max_quantity === 1 && !soldOut;

  return (
    <div
      id={slug}
      data-testid={`sponsorship-card-${item.id}`}
      data-sold-out={soldOut}
      className={[
        "relative flex flex-col rounded-lg border border-border/60 bg-white p-6 shadow-sm",
        "transition-[transform,box-shadow] duration-200",
        "hover:-translate-y-px",
        soldOut ? "opacity-[0.55] pointer-events-none" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Inventory pill — only Bloody Mary (max_quantity=1) when not sold out */}
      {showInventoryPill && (
        <div
          className="mb-3 inline-flex w-fit items-center rounded-full border border-brand/30 bg-brand-muted px-3 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-brand-dark"
        >
          1 of 1 available
        </div>
      )}

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

      {/* Summary */}
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {summary}
      </p>

      {/* CTA */}
      <button
        type="button"
        disabled={soldOut}
        onClick={() => !soldOut && onSelect(item.id)}
        className={[
          "mt-5 w-full rounded-md px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white transition-colors duration-150",
          soldOut
            ? "cursor-not-allowed bg-muted text-muted-foreground"
            : "bg-brand-darker hover:bg-brand",
        ].join(" ")}
      >
        {soldOut ? "Sold Out" : "Select package →"}
      </button>
    </div>
  );
}
