/**
 * open-sponsorships-block.test.tsx — Sprint 22 RED phase
 *
 * Tests for OpenSponsorshipsBlock at src/components/public/open-sponsorships-block.tsx.
 * That file does not exist yet — Bolt creates it in PR B (GREEN).
 *
 * The static import on line ~30 fails at vite transform time with "module not found",
 * causing the entire suite to fail before any tests run. This is the expected RED state.
 * Bolt's GREEN PR creates the file and makes these tests pass.
 *
 * RED phase per craven sprint pattern (#247, #248, #249).
 *
 * Component props (per plan):
 *   interface OpenSponsorshipsBlockProps {
 *     items: Array<{ id: string; name: string; price_cents: number }>;
 *   }
 *
 * Behavior contract:
 *   - Renders one chip per item in props
 *   - Each chip shows item.name
 *   - Each chip shows "From $X" price formatted from price_cents
 *   - Each chip's <a href> is "/sponsorships"
 *   - "Browse all sponsorships →" CTA is present and links to "/sponsorships"
 *   - Returns null when items is empty
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
// @ts-expect-error — module does not exist yet; Bolt creates it in PR B
import { OpenSponsorshipsBlock } from "@/components/public/open-sponsorships-block";

type OpenSponsorshipsItem = { id: string; name: string; price_cents: number };

interface OpenSponsorshipsBlockProps {
  items: OpenSponsorshipsItem[];
}

// Cast to component type — will be undefined at RED phase
const Block = OpenSponsorshipsBlock as React.ComponentType<OpenSponsorshipsBlockProps>;

const SAMPLE_ITEMS: OpenSponsorshipsItem[] = [
  { id: "tier-champion", name: "Champion Sponsor", price_cents: 500000 },
  { id: "tier-eagle", name: "Eagle Sponsor", price_cents: 250000 },
  { id: "tier-hole", name: "Hole Sponsor", price_cents: 50000 },
];

// ---------------------------------------------------------------------------
// Test 20: One chip per item
// ---------------------------------------------------------------------------

describe("OpenSponsorshipsBlock — chip count", () => {
  it("renders one chip per item in props", () => {
    const { container } = render(<Block items={SAMPLE_ITEMS} />);
    // Each chip is a link to /sponsorships that contains the item name
    const chips = Array.from(
      container.querySelectorAll("a[href='/sponsorships']")
    ).filter((el) =>
      SAMPLE_ITEMS.some((item) => el.textContent?.includes(item.name))
    );
    expect(chips).toHaveLength(SAMPLE_ITEMS.length);
  });
});

// ---------------------------------------------------------------------------
// Test 21: Each chip shows item name
// ---------------------------------------------------------------------------

describe("OpenSponsorshipsBlock — chip names", () => {
  it("each chip shows the item's name", () => {
    render(<Block items={SAMPLE_ITEMS} />);
    for (const item of SAMPLE_ITEMS) {
      expect(screen.getByText(item.name)).toBeInTheDocument();
    }
  });
});

// ---------------------------------------------------------------------------
// Test 22: Each chip shows "From $X" formatted from price_cents
// ---------------------------------------------------------------------------

describe("OpenSponsorshipsBlock — chip price formatting", () => {
  it("$2,500 (price_cents=250000) displays as 'From $2,500'", () => {
    render(<Block items={[{ id: "tier-test", name: "Test Sponsor", price_cents: 250000 }]} />);
    expect(screen.getByText(/From \$2,500/)).toBeInTheDocument();
  });

  it("each item in SAMPLE_ITEMS shows a 'From $...' price prefix", () => {
    render(<Block items={SAMPLE_ITEMS} />);
    const allText = document.body.textContent ?? "";
    const fromMatches = allText.match(/From \$/g) ?? [];
    expect(fromMatches.length).toBeGreaterThanOrEqual(SAMPLE_ITEMS.length);
  });
});

// ---------------------------------------------------------------------------
// Test 23: Each chip href is /sponsorships
// ---------------------------------------------------------------------------

describe("OpenSponsorshipsBlock — chip hrefs", () => {
  it("each chip's <a href> points to '/sponsorships'", () => {
    const { container } = render(<Block items={SAMPLE_ITEMS} />);
    const chipLinks = Array.from(container.querySelectorAll("a")).filter((el) =>
      SAMPLE_ITEMS.some((item) => el.textContent?.includes(item.name))
    );
    expect(chipLinks.length).toBeGreaterThan(0);
    for (const link of chipLinks) {
      expect(link).toHaveAttribute("href", "/sponsorships");
    }
  });
});

// ---------------------------------------------------------------------------
// Test 24: "Browse all sponsorships →" CTA is present
// ---------------------------------------------------------------------------

describe("OpenSponsorshipsBlock — CTA", () => {
  it("renders a 'Browse all sponsorships' CTA linking to /sponsorships", () => {
    render(<Block items={SAMPLE_ITEMS} />);
    const cta = screen.getByRole("link", { name: /browse all sponsorships/i });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", "/sponsorships");
  });
});

// ---------------------------------------------------------------------------
// Test 25: Returns null when items is empty
// ---------------------------------------------------------------------------

describe("OpenSponsorshipsBlock — empty state", () => {
  it("renders nothing (returns null) when items array is empty", () => {
    const { container } = render(<Block items={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
