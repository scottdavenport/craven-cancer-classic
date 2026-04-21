/**
 * RED tests for SponsorCard patron (text-only) variant — GH #224
 *
 * Design spec: plans/patron-card-design.md
 * Direction: "Engraved Donor Wall" — typographic plaque, left-anchored,
 * Fraunces at extreme optical sizes, per-tier ornaments.
 *
 * These tests describe the TARGET state of src/components/public/sponsor-card.tsx
 * after Bolt implements the patron-card redesign.
 *
 * All tests in this file should be RED against main@153a4ac.
 * Logo-variant tests in sponsor-card.test.tsx are unaffected and must remain GREEN.
 *
 * TestID assumptions for Bolt:
 *   - `patron-drop-initial`   — Champion drop-initial <span aria-hidden="true">
 *   - `patron-subline`        — Champion subline <span aria-hidden="true">
 *   - `patron-fleuron`        — Champion fleuron <span aria-hidden="true">
 *   - `patron-ornament`       — Eagle inline ❧ <span aria-hidden="true">
 *   - `patron-rule`           — Standard teal rule <div aria-hidden="true">
 *   - `patron-accent-wrapper` — Compact inner text wrapper (has border-l-2)
 *
 * fontVariationSettings format (inline style, as a string):
 *   "'opsz' 144"   — Champion drop-initial + name
 *   "'opsz' 72"    — Eagle name
 *   "'opsz' 36"    — Standard name
 *   "'opsz' 9"     — Compact name
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock next/image — jsdom can't resolve Next Image optimization pipeline.
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    [key: string]: unknown;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

// ---------------------------------------------------------------------------
// Lazy component resolution
// ---------------------------------------------------------------------------

let SponsorCard: React.ComponentType<{
  sponsor: {
    id: string;
    name: string;
    logo_url: string | null;
    website: string | null;
  };
  tierSize: "champion" | "eagle" | "standard" | "compact";
}> | null = null;

beforeAll(async () => {
  try {
    const mod = await import("../sponsor-card");
    SponsorCard = mod.SponsorCard;
  } catch {
    SponsorCard = null;
  }
});

type SponsorCardProps = {
  sponsor: {
    id: string;
    name: string;
    logo_url: string | null;
    website: string | null;
  };
  tierSize: "champion" | "eagle" | "standard" | "compact";
};

function renderCard(props: SponsorCardProps): ReturnType<typeof render> {
  if (!SponsorCard) {
    throw new Error(
      "SponsorCard component not found. " +
        "Bolt needs to create src/components/public/sponsor-card.tsx (RED test — #224)"
    );
  }
  return render(<SponsorCard {...props} />);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Champion: first name "Scottie" → drop-initial "S"
const CHAMPION_PATRON = {
  id: "pat-champion-1",
  name: "Scottie Davenport",
  logo_url: null,
  website: "https://example.com",
};

const CHAMPION_PATRON_NO_LINK = {
  id: "pat-champion-2",
  name: "Scottie Davenport",
  logo_url: null,
  website: null,
};

// Eagle patron
const EAGLE_PATRON = {
  id: "pat-eagle-1",
  name: "Mike Evans",
  logo_url: null,
  website: "https://example.com",
};

// Standard patron — multi-word name
const STANDARD_PATRON = {
  id: "pat-standard-1",
  name: "Jane Memorial Fund",
  logo_url: null,
  website: null,
};

// Compact patron
const COMPACT_PATRON = {
  id: "pat-compact-1",
  name: "Friend of the Classic",
  logo_url: null,
  website: null,
};

// Edge case: single-word name → initial still works
const SINGLE_WORD_PATRON = {
  id: "pat-single-1",
  name: "Acme",
  logo_url: null,
  website: null,
};

// ===========================================================================
// CHAMPION PATRON CARD
// ===========================================================================

describe("SponsorCard — Champion patron card", () => {
  describe("card root", () => {
    it("renders patron card root with testid sponsor-card-text-{id}", () => {
      renderCard({ sponsor: CHAMPION_PATRON, tierSize: "champion" });
      expect(
        screen.getByTestId(`sponsor-card-text-${CHAMPION_PATRON.id}`)
      ).toBeInTheDocument();
    });

    it("card has bg-cream class", () => {
      const { container } = renderCard({
        sponsor: CHAMPION_PATRON,
        tierSize: "champion",
      });
      const card = screen.getByTestId(`sponsor-card-text-${CHAMPION_PATRON.id}`);
      const hasCream =
        card.className.includes("bg-cream") ||
        Array.from(card.querySelectorAll("*")).some(
          (el) => el.className && el.className.includes("bg-cream")
        );
      expect(hasCream).toBe(true);
      // container used for broader search
      expect(container.innerHTML).toContain("bg-cream");
    });

    it("card has border-l-4 class (left brand accent)", () => {
      const { container } = renderCard({
        sponsor: CHAMPION_PATRON,
        tierSize: "champion",
      });
      const hasBorderL4 = Array.from(container.querySelectorAll("*")).some(
        (el) => el.className && el.className.includes("border-l-4")
      );
      expect(hasBorderL4).toBe(true);
    });

    it("card has border-l-brand class", () => {
      const { container } = renderCard({
        sponsor: CHAMPION_PATRON,
        tierSize: "champion",
      });
      const hasBorderLBrand = Array.from(container.querySelectorAll("*")).some(
        (el) => el.className && el.className.includes("border-l-brand")
      );
      expect(hasBorderLBrand).toBe(true);
    });
  });

  describe("drop-initial", () => {
    it("renders a patron-drop-initial element", () => {
      renderCard({ sponsor: CHAMPION_PATRON, tierSize: "champion" });
      expect(screen.getByTestId("patron-drop-initial")).toBeInTheDocument();
    });

    it("drop-initial has aria-hidden=true (decorative)", () => {
      renderCard({ sponsor: CHAMPION_PATRON, tierSize: "champion" });
      const el = screen.getByTestId("patron-drop-initial");
      expect(el).toHaveAttribute("aria-hidden", "true");
    });

    it("drop-initial contains the first letter of the first name word (S for Scottie Davenport)", () => {
      renderCard({ sponsor: CHAMPION_PATRON, tierSize: "champion" });
      const el = screen.getByTestId("patron-drop-initial");
      expect(el.textContent).toBe("S");
    });

    it("drop-initial has font-display class", () => {
      renderCard({ sponsor: CHAMPION_PATRON, tierSize: "champion" });
      const el = screen.getByTestId("patron-drop-initial");
      expect(el.className).toContain("font-display");
    });

    it("drop-initial has italic class", () => {
      renderCard({ sponsor: CHAMPION_PATRON, tierSize: "champion" });
      const el = screen.getByTestId("patron-drop-initial");
      expect(el.className).toContain("italic");
    });

    it("drop-initial inline fontVariationSettings contains 'opsz' 144", () => {
      renderCard({ sponsor: CHAMPION_PATRON, tierSize: "champion" });
      const el = screen.getByTestId("patron-drop-initial") as HTMLElement;
      // React serializes inline style fontVariationSettings as a string on the element
      expect(el.style.fontVariationSettings).toContain("'opsz' 144");
    });

    it("drop-initial is a <span> element", () => {
      renderCard({ sponsor: CHAMPION_PATRON, tierSize: "champion" });
      const el = screen.getByTestId("patron-drop-initial");
      expect(el.tagName.toLowerCase()).toBe("span");
    });
  });

  describe("name element", () => {
    it("full sponsor.name is present in the document (not replaced by drop-initial)", () => {
      renderCard({ sponsor: CHAMPION_PATRON, tierSize: "champion" });
      // The full name must appear as accessible text content
      expect(screen.getByText(CHAMPION_PATRON.name)).toBeInTheDocument();
    });

    it("name element has inline fontVariationSettings containing 'opsz' 144", () => {
      renderCard({ sponsor: CHAMPION_PATRON, tierSize: "champion" });
      // Find the element whose textContent exactly matches the full name
      const nameEl = screen.getByText(CHAMPION_PATRON.name) as HTMLElement;
      expect(nameEl.style.fontVariationSettings).toContain("'opsz' 144");
    });

    it("name element has font-display class", () => {
      renderCard({ sponsor: CHAMPION_PATRON, tierSize: "champion" });
      const nameEl = screen.getByText(CHAMPION_PATRON.name);
      expect(nameEl.className).toContain("font-display");
    });
  });

  describe("subline", () => {
    it("renders patron-subline element", () => {
      renderCard({ sponsor: CHAMPION_PATRON, tierSize: "champion" });
      expect(screen.getByTestId("patron-subline")).toBeInTheDocument();
    });

    it("subline has aria-hidden=true (decorative)", () => {
      renderCard({ sponsor: CHAMPION_PATRON, tierSize: "champion" });
      const el = screen.getByTestId("patron-subline");
      expect(el).toHaveAttribute("aria-hidden", "true");
    });

    it("subline text contains 'Est. 2010'", () => {
      renderCard({ sponsor: CHAMPION_PATRON, tierSize: "champion" });
      const el = screen.getByTestId("patron-subline");
      expect(el.textContent).toContain("Est. 2010");
    });

    it("subline text contains 'Champion Patron'", () => {
      renderCard({ sponsor: CHAMPION_PATRON, tierSize: "champion" });
      const el = screen.getByTestId("patron-subline");
      expect(el.textContent).toContain("Champion Patron");
    });
  });

  describe("fleuron", () => {
    it("renders patron-fleuron element with ❦ character", () => {
      renderCard({ sponsor: CHAMPION_PATRON, tierSize: "champion" });
      const el = screen.getByTestId("patron-fleuron");
      expect(el).toBeInTheDocument();
      expect(el.textContent).toContain("❦");
    });

    it("fleuron has aria-hidden=true (decorative)", () => {
      renderCard({ sponsor: CHAMPION_PATRON, tierSize: "champion" });
      const el = screen.getByTestId("patron-fleuron");
      expect(el).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("accessibility", () => {
    it("screen-reader-visible text content equals sponsor.name", () => {
      renderCard({ sponsor: CHAMPION_PATRON, tierSize: "champion" });
      const card = screen.getByTestId(
        `sponsor-card-text-${CHAMPION_PATRON.id}`
      );
      // Collect textContent from all non-aria-hidden children
      const visibleText = Array.from(card.querySelectorAll("*"))
        .filter((el) => el.getAttribute("aria-hidden") !== "true")
        .map((el) => el.textContent ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      expect(visibleText).toContain(CHAMPION_PATRON.name);
    });

    it("card does NOT render logo img (patron is text-only)", () => {
      renderCard({ sponsor: CHAMPION_PATRON, tierSize: "champion" });
      expect(
        screen.queryByTestId(`sponsor-logo-${CHAMPION_PATRON.id}`)
      ).not.toBeInTheDocument();
    });
  });

  describe("link wrapping", () => {
    it("wraps in <a> when website is set", () => {
      const { container } = renderCard({
        sponsor: CHAMPION_PATRON,
        tierSize: "champion",
      });
      const link = container.querySelector("a");
      expect(link).not.toBeNull();
      expect(link).toHaveAttribute("href", CHAMPION_PATRON.website);
    });

    it("renders as <div> (not <a>) when website is null", () => {
      const { container } = renderCard({
        sponsor: CHAMPION_PATRON_NO_LINK,
        tierSize: "champion",
      });
      const link = container.querySelector("a");
      expect(link).toBeNull();
      const card = screen.getByTestId(
        `sponsor-card-text-${CHAMPION_PATRON_NO_LINK.id}`
      );
      expect(card.tagName.toLowerCase()).toBe("div");
    });
  });

  describe("edge case: single-word name", () => {
    it("drop-initial renders first character of single-word name", () => {
      renderCard({ sponsor: SINGLE_WORD_PATRON, tierSize: "champion" });
      const el = screen.getByTestId("patron-drop-initial");
      expect(el.textContent).toBe("A");
    });
  });
});

// ===========================================================================
// EAGLE PATRON CARD
// ===========================================================================

describe("SponsorCard — Eagle patron card", () => {
  describe("card root", () => {
    it("renders patron card root with testid sponsor-card-text-{id}", () => {
      renderCard({ sponsor: EAGLE_PATRON, tierSize: "eagle" });
      expect(
        screen.getByTestId(`sponsor-card-text-${EAGLE_PATRON.id}`)
      ).toBeInTheDocument();
    });

    it("card has bg-cream class", () => {
      const { container } = renderCard({
        sponsor: EAGLE_PATRON,
        tierSize: "eagle",
      });
      expect(container.innerHTML).toContain("bg-cream");
    });

    it("card has grain-overlay class", () => {
      const { container } = renderCard({
        sponsor: EAGLE_PATRON,
        tierSize: "eagle",
      });
      const hasGrain = Array.from(container.querySelectorAll("*")).some(
        (el) => el.className && el.className.includes("grain-overlay")
      );
      expect(hasGrain).toBe(true);
    });

    it("card does NOT have border-l-4 class (no left border on eagle)", () => {
      const { container } = renderCard({
        sponsor: EAGLE_PATRON,
        tierSize: "eagle",
      });
      const hasBorderL4 = Array.from(container.querySelectorAll("*")).some(
        (el) => el.className && el.className.includes("border-l-4")
      );
      expect(hasBorderL4).toBe(false);
    });
  });

  describe("no drop-initial", () => {
    it("does NOT render patron-drop-initial element", () => {
      renderCard({ sponsor: EAGLE_PATRON, tierSize: "eagle" });
      expect(screen.queryByTestId("patron-drop-initial")).not.toBeInTheDocument();
    });
  });

  describe("ornament", () => {
    it("renders patron-ornament element", () => {
      renderCard({ sponsor: EAGLE_PATRON, tierSize: "eagle" });
      expect(screen.getByTestId("patron-ornament")).toBeInTheDocument();
    });

    it("ornament contains ❧ character", () => {
      renderCard({ sponsor: EAGLE_PATRON, tierSize: "eagle" });
      const el = screen.getByTestId("patron-ornament");
      expect(el.textContent).toContain("❧");
    });

    it("ornament has aria-hidden=true (decorative)", () => {
      renderCard({ sponsor: EAGLE_PATRON, tierSize: "eagle" });
      const el = screen.getByTestId("patron-ornament");
      expect(el).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("name element", () => {
    it("full sponsor.name is present in the document", () => {
      renderCard({ sponsor: EAGLE_PATRON, tierSize: "eagle" });
      expect(screen.getByText(EAGLE_PATRON.name)).toBeInTheDocument();
    });

    it("name element has inline fontVariationSettings containing 'opsz' 72", () => {
      renderCard({ sponsor: EAGLE_PATRON, tierSize: "eagle" });
      const nameEl = screen.getByText(EAGLE_PATRON.name) as HTMLElement;
      expect(nameEl.style.fontVariationSettings).toContain("'opsz' 72");
    });

    it("name element has font-display class", () => {
      renderCard({ sponsor: EAGLE_PATRON, tierSize: "eagle" });
      const nameEl = screen.getByText(EAGLE_PATRON.name);
      expect(nameEl.className).toContain("font-display");
    });
  });

  describe("no champion-only elements", () => {
    it("does NOT render patron-fleuron", () => {
      renderCard({ sponsor: EAGLE_PATRON, tierSize: "eagle" });
      expect(screen.queryByTestId("patron-fleuron")).not.toBeInTheDocument();
    });

    it("does NOT render patron-subline", () => {
      renderCard({ sponsor: EAGLE_PATRON, tierSize: "eagle" });
      expect(screen.queryByTestId("patron-subline")).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("screen-reader-visible text content contains sponsor.name", () => {
      renderCard({ sponsor: EAGLE_PATRON, tierSize: "eagle" });
      const card = screen.getByTestId(`sponsor-card-text-${EAGLE_PATRON.id}`);
      const visibleText = Array.from(card.querySelectorAll("*"))
        .filter((el) => el.getAttribute("aria-hidden") !== "true")
        .map((el) => el.textContent ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      expect(visibleText).toContain(EAGLE_PATRON.name);
    });
  });
});

// ===========================================================================
// STANDARD PATRON CARD
// ===========================================================================

describe("SponsorCard — Standard patron card", () => {
  describe("card root", () => {
    it("renders patron card root with testid sponsor-card-text-{id}", () => {
      renderCard({ sponsor: STANDARD_PATRON, tierSize: "standard" });
      expect(
        screen.getByTestId(`sponsor-card-text-${STANDARD_PATRON.id}`)
      ).toBeInTheDocument();
    });

    it("card has bg-cream class", () => {
      const { container } = renderCard({
        sponsor: STANDARD_PATRON,
        tierSize: "standard",
      });
      expect(container.innerHTML).toContain("bg-cream");
    });

    it("card does NOT have grain-overlay class (reserved for champion/eagle)", () => {
      const { container } = renderCard({
        sponsor: STANDARD_PATRON,
        tierSize: "standard",
      });
      const hasGrain = Array.from(container.querySelectorAll("*")).some(
        (el) => el.className && el.className.includes("grain-overlay")
      );
      expect(hasGrain).toBe(false);
    });

    it("card does NOT have border-l-4 class", () => {
      const { container } = renderCard({
        sponsor: STANDARD_PATRON,
        tierSize: "standard",
      });
      const hasBorderL4 = Array.from(container.querySelectorAll("*")).some(
        (el) => el.className && el.className.includes("border-l-4")
      );
      expect(hasBorderL4).toBe(false);
    });
  });

  describe("teal rule", () => {
    it("renders patron-rule element", () => {
      renderCard({ sponsor: STANDARD_PATRON, tierSize: "standard" });
      expect(screen.getByTestId("patron-rule")).toBeInTheDocument();
    });

    it("rule has aria-hidden=true (decorative)", () => {
      renderCard({ sponsor: STANDARD_PATRON, tierSize: "standard" });
      const el = screen.getByTestId("patron-rule");
      expect(el).toHaveAttribute("aria-hidden", "true");
    });

    it("rule has h-px class (1px height)", () => {
      renderCard({ sponsor: STANDARD_PATRON, tierSize: "standard" });
      const el = screen.getByTestId("patron-rule");
      expect(el.className).toContain("h-px");
    });

    it("rule has w-6 class (24px width)", () => {
      renderCard({ sponsor: STANDARD_PATRON, tierSize: "standard" });
      const el = screen.getByTestId("patron-rule");
      expect(el.className).toContain("w-6");
    });

    it("rule has bg-brand class (teal color)", () => {
      renderCard({ sponsor: STANDARD_PATRON, tierSize: "standard" });
      const el = screen.getByTestId("patron-rule");
      expect(el.className).toContain("bg-brand");
    });

    it("rule is a <div> element", () => {
      renderCard({ sponsor: STANDARD_PATRON, tierSize: "standard" });
      const el = screen.getByTestId("patron-rule");
      expect(el.tagName.toLowerCase()).toBe("div");
    });
  });

  describe("name element", () => {
    it("full sponsor.name is present in the document", () => {
      renderCard({ sponsor: STANDARD_PATRON, tierSize: "standard" });
      expect(screen.getByText(STANDARD_PATRON.name)).toBeInTheDocument();
    });

    it("name element has inline fontVariationSettings containing 'opsz' 36", () => {
      renderCard({ sponsor: STANDARD_PATRON, tierSize: "standard" });
      const nameEl = screen.getByText(STANDARD_PATRON.name) as HTMLElement;
      expect(nameEl.style.fontVariationSettings).toContain("'opsz' 36");
    });

    it("name element has font-display class", () => {
      renderCard({ sponsor: STANDARD_PATRON, tierSize: "standard" });
      const nameEl = screen.getByText(STANDARD_PATRON.name);
      expect(nameEl.className).toContain("font-display");
    });
  });

  describe("no champion/eagle-only elements", () => {
    it("does NOT render patron-drop-initial", () => {
      renderCard({ sponsor: STANDARD_PATRON, tierSize: "standard" });
      expect(screen.queryByTestId("patron-drop-initial")).not.toBeInTheDocument();
    });

    it("does NOT render patron-fleuron", () => {
      renderCard({ sponsor: STANDARD_PATRON, tierSize: "standard" });
      expect(screen.queryByTestId("patron-fleuron")).not.toBeInTheDocument();
    });

    it("does NOT render patron-ornament (❧)", () => {
      renderCard({ sponsor: STANDARD_PATRON, tierSize: "standard" });
      expect(screen.queryByTestId("patron-ornament")).not.toBeInTheDocument();
    });

    it("does NOT render patron-subline", () => {
      renderCard({ sponsor: STANDARD_PATRON, tierSize: "standard" });
      expect(screen.queryByTestId("patron-subline")).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("screen-reader-visible text content contains sponsor.name", () => {
      renderCard({ sponsor: STANDARD_PATRON, tierSize: "standard" });
      const card = screen.getByTestId(`sponsor-card-text-${STANDARD_PATRON.id}`);
      const visibleText = Array.from(card.querySelectorAll("*"))
        .filter((el) => el.getAttribute("aria-hidden") !== "true")
        .map((el) => el.textContent ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      expect(visibleText).toContain(STANDARD_PATRON.name);
    });
  });
});

// ===========================================================================
// COMPACT PATRON CARD
// ===========================================================================

describe("SponsorCard — Compact patron card", () => {
  describe("card root", () => {
    it("renders patron card root with testid sponsor-card-text-{id}", () => {
      renderCard({ sponsor: COMPACT_PATRON, tierSize: "compact" });
      expect(
        screen.getByTestId(`sponsor-card-text-${COMPACT_PATRON.id}`)
      ).toBeInTheDocument();
    });

    it("card has bg-cream class", () => {
      const { container } = renderCard({
        sponsor: COMPACT_PATRON,
        tierSize: "compact",
      });
      expect(container.innerHTML).toContain("bg-cream");
    });

    it("card does NOT have grain-overlay class", () => {
      const { container } = renderCard({
        sponsor: COMPACT_PATRON,
        tierSize: "compact",
      });
      const hasGrain = Array.from(container.querySelectorAll("*")).some(
        (el) => el.className && el.className.includes("grain-overlay")
      );
      expect(hasGrain).toBe(false);
    });
  });

  describe("accent wrapper", () => {
    it("renders patron-accent-wrapper element", () => {
      renderCard({ sponsor: COMPACT_PATRON, tierSize: "compact" });
      expect(screen.getByTestId("patron-accent-wrapper")).toBeInTheDocument();
    });

    it("accent wrapper has border-l-2 class", () => {
      renderCard({ sponsor: COMPACT_PATRON, tierSize: "compact" });
      const el = screen.getByTestId("patron-accent-wrapper");
      expect(el.className).toContain("border-l-2");
    });
  });

  describe("name element", () => {
    it("full sponsor.name is present in the document", () => {
      renderCard({ sponsor: COMPACT_PATRON, tierSize: "compact" });
      expect(screen.getByText(COMPACT_PATRON.name)).toBeInTheDocument();
    });

    it("name element has inline fontVariationSettings containing 'opsz' 9", () => {
      renderCard({ sponsor: COMPACT_PATRON, tierSize: "compact" });
      const nameEl = screen.getByText(COMPACT_PATRON.name) as HTMLElement;
      expect(nameEl.style.fontVariationSettings).toContain("'opsz' 9");
    });

    it("name element has font-display class", () => {
      renderCard({ sponsor: COMPACT_PATRON, tierSize: "compact" });
      const nameEl = screen.getByText(COMPACT_PATRON.name);
      expect(nameEl.className).toContain("font-display");
    });
  });

  describe("no champion/eagle-only elements", () => {
    it("does NOT render patron-drop-initial", () => {
      renderCard({ sponsor: COMPACT_PATRON, tierSize: "compact" });
      expect(screen.queryByTestId("patron-drop-initial")).not.toBeInTheDocument();
    });

    it("does NOT render patron-fleuron", () => {
      renderCard({ sponsor: COMPACT_PATRON, tierSize: "compact" });
      expect(screen.queryByTestId("patron-fleuron")).not.toBeInTheDocument();
    });

    it("does NOT render patron-rule (standard-specific)", () => {
      renderCard({ sponsor: COMPACT_PATRON, tierSize: "compact" });
      expect(screen.queryByTestId("patron-rule")).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("screen-reader-visible text content contains sponsor.name", () => {
      renderCard({ sponsor: COMPACT_PATRON, tierSize: "compact" });
      const card = screen.getByTestId(`sponsor-card-text-${COMPACT_PATRON.id}`);
      const visibleText = Array.from(card.querySelectorAll("*"))
        .filter((el) => el.getAttribute("aria-hidden") !== "true")
        .map((el) => el.textContent ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      expect(visibleText).toContain(COMPACT_PATRON.name);
    });
  });
});

// ===========================================================================
// CROSS-CUTTING: REGRESSION GUARDS
// ===========================================================================

describe("SponsorCard — patron card regression guards", () => {
  const patronFixtures: Array<{
    tier: "champion" | "eagle" | "standard" | "compact";
    sponsor: { id: string; name: string; logo_url: null; website: string | null };
  }> = [
    { tier: "champion", sponsor: CHAMPION_PATRON },
    { tier: "eagle", sponsor: EAGLE_PATRON },
    { tier: "standard", sponsor: STANDARD_PATRON },
    { tier: "compact", sponsor: COMPACT_PATRON },
  ];

  patronFixtures.forEach(({ tier, sponsor }) => {
    it(`${tier}: sponsor-card-text-{id} testid is present on root`, () => {
      renderCard({ sponsor, tierSize: tier });
      expect(
        screen.getByTestId(`sponsor-card-text-${sponsor.id}`)
      ).toBeInTheDocument();
    });

    it(`${tier}: does not render sponsor-card-logo-{id} (no logo for patron)`, () => {
      renderCard({ sponsor, tierSize: tier });
      expect(
        screen.queryByTestId(`sponsor-card-logo-${sponsor.id}`)
      ).not.toBeInTheDocument();
    });

    it(`${tier}: card has bg-cream (all patron tiers are cream, not white)`, () => {
      const { container } = renderCard({ sponsor, tierSize: tier });
      expect(container.innerHTML).toContain("bg-cream");
      // Current main uses bg-white for eagle/standard/compact logo cards —
      // patron redesign mandates cream for ALL tiers.
    });
  });

  describe("all ornamental elements are aria-hidden", () => {
    it("Champion fleuron ❦ is aria-hidden", () => {
      renderCard({ sponsor: CHAMPION_PATRON, tierSize: "champion" });
      const el = screen.getByTestId("patron-fleuron");
      expect(el).toHaveAttribute("aria-hidden", "true");
    });

    it("Champion drop-initial is aria-hidden", () => {
      renderCard({ sponsor: CHAMPION_PATRON, tierSize: "champion" });
      const el = screen.getByTestId("patron-drop-initial");
      expect(el).toHaveAttribute("aria-hidden", "true");
    });

    it("Champion subline is aria-hidden", () => {
      renderCard({ sponsor: CHAMPION_PATRON, tierSize: "champion" });
      const el = screen.getByTestId("patron-subline");
      expect(el).toHaveAttribute("aria-hidden", "true");
    });

    it("Eagle ornament ❧ is aria-hidden", () => {
      renderCard({ sponsor: EAGLE_PATRON, tierSize: "eagle" });
      const el = screen.getByTestId("patron-ornament");
      expect(el).toHaveAttribute("aria-hidden", "true");
    });

    it("Standard teal rule is aria-hidden", () => {
      renderCard({ sponsor: STANDARD_PATRON, tierSize: "standard" });
      const el = screen.getByTestId("patron-rule");
      expect(el).toHaveAttribute("aria-hidden", "true");
    });
  });
});
