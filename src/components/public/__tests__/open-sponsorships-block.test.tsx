/**
 * open-sponsorships-block.test.tsx — Sprint 22 RED phase, updated Sprint 23
 *
 * Tests for OpenSponsorshipsBlock at src/components/public/open-sponsorships-block.tsx.
 * Sprint 22 created this component. Sprint 23 updates chip hrefs from "/sponsorships"
 * (flat) to "/sponsorships#<slug>" (deep-link anchors).
 *
 * Sprint 23 changes (RED phase):
 *   - Tests 23 (chip hrefs) updated: chips now link to /sponsorships#<slug>
 *   - Tests 24-26 added: explicit per-name slug assertions
 *
 * RED phase per craven sprint pattern (#247, #248, #249, Sprint 22 #252).
 *
 * Component props (per plan):
 *   interface OpenSponsorshipsBlockProps {
 *     items: Array<{ id: string; name: string; price_cents: number }>;
 *   }
 *
 * Behavior contract (post Sprint 23):
 *   - Renders one chip per item in props
 *   - Each chip shows item.name
 *   - Each chip shows "From $X" price formatted from price_cents
 *   - Each chip's <a href> is "/sponsorships#<slugifyItemName(name)>"
 *   - "Browse all sponsorships →" CTA is present and links to "/sponsorships"
 *   - Returns null when items is empty
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
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

// Sprint 23: items with known slugs to lock the deep-link contract
const SLUG_TEST_ITEMS: OpenSponsorshipsItem[] = [
  { id: "golf-gift",       name: "Golf Gift",       price_cents: 250000 },
  { id: "bloody-mary-bar", name: "Bloody Mary Bar",  price_cents:  50000 },
  { id: "shot-of-the-day", name: "Shot of the Day", price_cents:  25000 },
];

// ---------------------------------------------------------------------------
// Test 20: One chip per item
// ---------------------------------------------------------------------------

describe("OpenSponsorshipsBlock — chip count", () => {
  it("renders one chip per item in props", () => {
    const { container } = render(<Block items={SAMPLE_ITEMS} />);
    // Sprint 23: chips now link to /sponsorships#<slug> — match by item name
    const chips = Array.from(
      container.querySelectorAll("a[href^='/sponsorships#']")
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
// Test 23: Each chip href is /sponsorships#<slug> (Sprint 23 — deep-link anchors)
//
// Sprint 22 asserted href="/sponsorships" (flat). Sprint 23 updates chip hrefs
// to "/sponsorships#<slugifyItemName(name)>" so clicking a chip scrolls directly
// to the matching card. This test is RED until Bolt updates the component.
// ---------------------------------------------------------------------------

describe("OpenSponsorshipsBlock — chip hrefs (Sprint 23 deep-link)", () => {
  it("each chip's <a href> includes the /sponsorships base path", () => {
    const { container } = render(<Block items={SAMPLE_ITEMS} />);
    const chipLinks = Array.from(container.querySelectorAll("a")).filter((el) =>
      SAMPLE_ITEMS.some((item) => el.textContent?.includes(item.name))
    );
    expect(chipLinks.length).toBeGreaterThan(0);
    for (const link of chipLinks) {
      expect(link.getAttribute("href")).toMatch(/^\/sponsorships/);
    }
  });

  it("each chip's <a href> includes a #<slug> anchor fragment", () => {
    const { container } = render(<Block items={SAMPLE_ITEMS} />);
    const chipLinks = Array.from(container.querySelectorAll("a")).filter((el) =>
      SAMPLE_ITEMS.some((item) => el.textContent?.includes(item.name))
    );
    expect(chipLinks.length).toBeGreaterThan(0);
    for (const link of chipLinks) {
      // href must contain a # fragment
      expect(link.getAttribute("href")).toContain("#");
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

// ---------------------------------------------------------------------------
// Tests 24-26: Deep-link slug anchors per item name (Sprint 23 RED)
//
// These lock the contract that chip hrefs are "/sponsorships#<slug>" where
// the slug is derived by slugifyItemName(item.name). Bolt's GREEN PR updates
// open-sponsorships-block.tsx to produce these hrefs.
// ---------------------------------------------------------------------------

describe("OpenSponsorshipsBlock — deep-link slug anchors (Sprint 23 RED)", () => {
  it('24 — chip for "Golf Gift" has href="/sponsorships#golf-gift"', () => {
    const { container } = render(<Block items={SLUG_TEST_ITEMS} />);
    const golfGiftChip = Array.from(container.querySelectorAll("a")).find(
      (el) => el.textContent?.includes("Golf Gift")
    );
    expect(golfGiftChip).not.toBeUndefined();
    expect(golfGiftChip).toHaveAttribute("href", "/sponsorships#golf-gift");
  });

  it('25 — chip for "Bloody Mary Bar" has href="/sponsorships#bloody-mary-bar"', () => {
    const { container } = render(<Block items={SLUG_TEST_ITEMS} />);
    const bloodyMaryChip = Array.from(container.querySelectorAll("a")).find(
      (el) => el.textContent?.includes("Bloody Mary Bar")
    );
    expect(bloodyMaryChip).not.toBeUndefined();
    expect(bloodyMaryChip).toHaveAttribute("href", "/sponsorships#bloody-mary-bar");
  });

  it('26 — chip for "Shot of the Day" has href="/sponsorships#shot-of-the-day"', () => {
    const { container } = render(<Block items={SLUG_TEST_ITEMS} />);
    const shotChip = Array.from(container.querySelectorAll("a")).find(
      (el) => el.textContent?.includes("Shot of the Day")
    );
    expect(shotChip).not.toBeUndefined();
    expect(shotChip).toHaveAttribute("href", "/sponsorships#shot-of-the-day");
  });
});
