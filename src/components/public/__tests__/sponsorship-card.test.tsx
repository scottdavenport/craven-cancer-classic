/**
 * sponsorship-card.test.tsx — Sprint 23 RED phase
 *
 * Tests for `SponsorshipCard` component at src/components/public/sponsorship-card.tsx.
 * That file does not exist yet — Bolt creates it in PR B (GREEN). Until then, the
 * static import fails at vite transform time with "module not found", causing the
 * entire suite to fail before any tests run. This is the expected RED state.
 *
 * RED phase per craven sprint pattern (#247, #248, #249, Sprint 22 #252).
 *
 * Component props contract (per plan):
 *   interface SponsorshipCardProps {
 *     item: {
 *       id: string;
 *       name: string;
 *       price_cents: number;
 *       max_quantity: number | null;
 *       sold_count: number;
 *     };
 *     summary: string;       // one-line summary text
 *     onSelect: (id: string) => void;
 *   }
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SponsorshipCard } from "@/components/public/sponsorship-card";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const BASE_ITEM = {
  id: "champion",
  name: "Champion",
  price_cents: 500000,   // $5,000
  max_quantity: null,
  sold_count: 0,
};

const BLOODY_MARY_ITEM = {
  id: "bloody-mary-bar",
  name: "Bloody Mary Bar",
  price_cents: 50000,    // $500
  max_quantity: 1,
  sold_count: 0,
};

const SOLD_OUT_ITEM = {
  id: "shot-of-the-day",
  name: "Shot of the Day",
  price_cents: 25000,    // $250
  max_quantity: 1,
  sold_count: 1,
};

const GOLF_GIFT_ITEM = {
  id: "golf-gift",
  name: "Golf Gift",
  price_cents: 250000,   // $2,500
  max_quantity: null,
  sold_count: 0,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SponsorshipCard — price display", () => {
  it("formats price_cents with thousands separator and no decimals for whole dollars", () => {
    render(
      <SponsorshipCard
        item={BASE_ITEM as any}
        summary="Title sponsor with premium placement."
        onSelect={vi.fn()}
      />
    );
    // $5,000 — thousands separator, dollar sign, no .00
    expect(screen.getByText("$5,000")).toBeInTheDocument();
  });

  it("formats $2,500 (price_cents=250000) correctly", () => {
    render(
      <SponsorshipCard
        item={GOLF_GIFT_ITEM as any}
        summary="A premium gift package for golfers."
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("$2,500")).toBeInTheDocument();
  });
});

describe("SponsorshipCard — package name", () => {
  it("renders the package name exactly", () => {
    render(
      <SponsorshipCard
        item={BASE_ITEM as any}
        summary="Title sponsor with premium placement."
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("Champion")).toBeInTheDocument();
  });
});

describe("SponsorshipCard — summary", () => {
  it("renders the summary prop text", () => {
    const summary = "Premium logo placement on all printed materials.";
    render(
      <SponsorshipCard
        item={BASE_ITEM as any}
        summary={summary}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText(summary)).toBeInTheDocument();
  });
});

describe("SponsorshipCard — anchor id", () => {
  it('card root has id matching slugifyItemName(item.name) — "Bloody Mary Bar" → id="bloody-mary-bar"', () => {
    const { container } = render(
      <SponsorshipCard
        item={BLOODY_MARY_ITEM as any}
        summary="The signature morning bar package."
        onSelect={vi.fn()}
      />
    );
    // The card root element should have id derived from slugifyItemName(name)
    const card = container.querySelector('[id="bloody-mary-bar"]');
    expect(card).not.toBeNull();
  });

  it('card root has id matching slugifyItemName(item.name) — "Golf Gift" → id="golf-gift"', () => {
    const { container } = render(
      <SponsorshipCard
        item={GOLF_GIFT_ITEM as any}
        summary="Premium gift for every golfer."
        onSelect={vi.fn()}
      />
    );
    const card = container.querySelector('[id="golf-gift"]');
    expect(card).not.toBeNull();
  });
});

describe("SponsorshipCard — tax pill", () => {
  it('renders the tax pill with text "Tax-deductible · receipt provided"', () => {
    render(
      <SponsorshipCard
        item={BASE_ITEM as any}
        summary="Title sponsor with premium placement."
        onSelect={vi.fn()}
      />
    );
    expect(
      screen.getByText("Tax-deductible · receipt provided")
    ).toBeInTheDocument();
  });
});

describe("SponsorshipCard — inventory pill (max_quantity === null)", () => {
  it("does NOT render an inventory pill when max_quantity is null", () => {
    const { container } = render(
      <SponsorshipCard
        item={BASE_ITEM as any}
        summary="Title sponsor with premium placement."
        onSelect={vi.fn()}
      />
    );
    // No inventory pill text should appear — the pattern is "X of Y available"
    expect(container.textContent).not.toMatch(/\d+ of \d+ available/);
  });
});

describe("SponsorshipCard — inventory pill (max_quantity === 1, sold_count === 0)", () => {
  it('renders inventory pill "1 of 1 available" when max_quantity=1 and sold_count=0', () => {
    render(
      <SponsorshipCard
        item={BLOODY_MARY_ITEM as any}
        summary="The signature morning bar package."
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("1 of 1 available")).toBeInTheDocument();
  });
});

describe("SponsorshipCard — sold-out state (max_quantity === 1, sold_count === 1)", () => {
  it("card is visually marked sold-out — opacity reduced on card wrapper", () => {
    const { container } = render(
      <SponsorshipCard
        item={SOLD_OUT_ITEM as any}
        summary="The shot-of-the-day experience."
        onSelect={vi.fn()}
      />
    );
    // Sold-out cards must have opacity-[0.55] or similar. Check the outermost
    // element has an opacity class or inline style indicating reduced opacity.
    const outerEl = container.firstElementChild as HTMLElement;
    const opacityClass = outerEl?.className?.includes("opacity") ?? false;
    const opacityStyle =
      outerEl?.style?.opacity !== undefined && outerEl?.style?.opacity !== "";
    expect(opacityClass || opacityStyle).toBe(true);
  });

  it("sold-out card CTA is non-interactive — pointer-events-none or disabled attribute", () => {
    const { container } = render(
      <SponsorshipCard
        item={SOLD_OUT_ITEM as any}
        summary="The shot-of-the-day experience."
        onSelect={vi.fn()}
      />
    );
    // The CTA button/element must be disabled or have pointer-events-none
    const cta = container.querySelector("button");
    if (cta) {
      const isDisabled =
        cta.disabled ||
        cta.getAttribute("aria-disabled") === "true" ||
        cta.className.includes("pointer-events-none");
      expect(isDisabled).toBe(true);
    } else {
      // If rendered as a non-button, check wrapper for pointer-events-none
      const pointerNone = container.innerHTML.includes("pointer-events-none");
      expect(pointerNone).toBe(true);
    }
  });
});

describe("SponsorshipCard — CTA button", () => {
  it('CTA button text is "Select package" (with or without arrow character)', () => {
    render(
      <SponsorshipCard
        item={BASE_ITEM as any}
        summary="Title sponsor with premium placement."
        onSelect={vi.fn()}
      />
    );
    // Allow "Select package" or "Select package →"
    const cta = screen.getByRole("button", { name: /select package/i });
    expect(cta).toBeInTheDocument();
  });

  it("CTA button does NOT use bg-purple class", () => {
    const { container } = render(
      <SponsorshipCard
        item={BASE_ITEM as any}
        summary="Title sponsor with premium placement."
        onSelect={vi.fn()}
      />
    );
    // bg-purple is the off-brand color being removed in Sprint 23
    expect(container.innerHTML).not.toContain("bg-purple");
  });

  it("CTA button uses brand-darker background (class or inline style)", () => {
    const { container } = render(
      <SponsorshipCard
        item={BASE_ITEM as any}
        summary="Title sponsor with premium placement."
        onSelect={vi.fn()}
      />
    );
    // The button must use bg-brand-darker class OR var(--brand-darker) inline style
    const hasBrandDarkerClass = container.innerHTML.includes("bg-brand-darker");
    const hasBrandDarkerVar = container.innerHTML.includes("--brand-darker");
    expect(hasBrandDarkerClass || hasBrandDarkerVar).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Watchdog-added cases 13, 17, 19, 21 — inline GREEN tests
// ---------------------------------------------------------------------------

describe("SponsorshipCard — Watchdog case 13: data-testid attribute", () => {
  it('card 13 — root element has data-testid="sponsorship-card-{item.id}"', () => {
    const { container } = render(
      <SponsorshipCard
        item={BASE_ITEM as any}
        summary="Title sponsor with premium placement."
        onSelect={vi.fn()}
      />
    );
    const card = container.querySelector('[data-testid="sponsorship-card-champion"]');
    expect(card).not.toBeNull();
  });
});

describe("SponsorshipCard — Watchdog case 17: inventory pill absent when sold out", () => {
  it("card 17 — inventory pill is absent when max_quantity=1 AND sold_count=1 (sold out)", () => {
    const { container } = render(
      <SponsorshipCard
        item={SOLD_OUT_ITEM as any}
        summary="The shot-of-the-day experience."
        onSelect={vi.fn()}
      />
    );
    // Sold-out: inventory pill must NOT appear
    expect(container.textContent).not.toMatch(/\d+ of \d+ available/);
  });
});

describe("SponsorshipCard — Watchdog case 19: sold-out CTA text", () => {
  it('card 19 — CTA text is exactly "Sold Out" when item is sold out', () => {
    render(
      <SponsorshipCard
        item={SOLD_OUT_ITEM as any}
        summary="The shot-of-the-day experience."
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("Sold Out")).toBeInTheDocument();
  });
});

describe("SponsorshipCard — Watchdog case 21: no font-display class", () => {
  it("card 21 — no font-display class appears anywhere in the card (Fraunces regression)", () => {
    const { container } = render(
      <SponsorshipCard
        item={BASE_ITEM as any}
        summary="Title sponsor with premium placement."
        onSelect={vi.fn()}
      />
    );
    expect(container.innerHTML).not.toContain("font-display");
  });
});
