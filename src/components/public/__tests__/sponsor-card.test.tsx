/**
 * RED tests for SponsorCard component — #220 Public Sponsors Redesign
 *
 * These tests describe the TARGET state for src/components/public/sponsor-card.tsx
 * which does NOT exist yet.
 *
 * How they are RED:
 *   - The vi.mock factory tries to load "../sponsor-card".
 *   - Until Bolt creates the file, every test that calls renderCard() will
 *     fail because SponsorCard is undefined (caught in the beforeAll).
 *   - Once the file exists, tests fail on missing testids / wrong classes
 *     until the implementation is complete.
 *
 * Design spec: plans/public-sponsors-redesign.md
 * Test ID conventions: plans/public-sponsors-redesign.md §TestIDs
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll } from "vitest";

// ---------------------------------------------------------------------------
// Lazy component resolution
// We use a module-level ref populated in beforeAll so vitest can
// collect all test names before the import is attempted.
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
    // Component does not exist yet — SponsorCard stays null.
    // Individual tests will throw when they try to render null.
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

// Helper — throws a readable error if the component hasn't been created yet
function renderCard(props: SponsorCardProps): ReturnType<typeof render> {
  if (!SponsorCard) {
    throw new Error(
      "SponsorCard component not found. " +
        "Bolt needs to create src/components/public/sponsor-card.tsx (RED test — #220)"
    );
  }
  return render(<SponsorCard {...props} />);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_SPONSOR = {
  id: "sp-1",
  name: "Acme Healthcare",
  logo_url: "https://example.com/acme-logo.png",
  website: "https://acme.com",
};

const NO_LOGO_SPONSOR = {
  id: "sp-2",
  name: "Sunrise Foundation",
  logo_url: null,
  website: "https://sunrise.org",
};

const NO_WEBSITE_SPONSOR = {
  id: "sp-3",
  name: "Local Credit Union",
  logo_url: "https://example.com/lcu-logo.png",
  website: null,
};

const TEXT_NO_WEBSITE_SPONSOR = {
  id: "sp-4",
  name: "Anonymous Donor",
  logo_url: null,
  website: null,
};

// ---------------------------------------------------------------------------
// Logo variant — core rendering
// ---------------------------------------------------------------------------

describe("SponsorCard — logo variant", () => {
  it("renders data-testid=sponsor-card-logo-{id} when logo_url is set", () => {
    renderCard({ sponsor: BASE_SPONSOR, tierSize: "eagle" });
    expect(screen.getByTestId("sponsor-card-logo-sp-1")).toBeInTheDocument();
  });

  it("does NOT render data-testid=sponsor-card-text-{id} when logo_url is set", () => {
    renderCard({ sponsor: BASE_SPONSOR, tierSize: "eagle" });
    expect(screen.queryByTestId("sponsor-card-text-sp-1")).not.toBeInTheDocument();
  });

  it("renders an <img> with data-testid=sponsor-logo-{id}", () => {
    renderCard({ sponsor: BASE_SPONSOR, tierSize: "eagle" });
    expect(screen.getByTestId("sponsor-logo-sp-1")).toBeInTheDocument();
  });

  it("logo img has correct src", () => {
    renderCard({ sponsor: BASE_SPONSOR, tierSize: "eagle" });
    const img = screen.getByTestId("sponsor-logo-sp-1");
    expect(img).toHaveAttribute("src", BASE_SPONSOR.logo_url);
  });

  it("logo img has alt set to sponsor.name", () => {
    renderCard({ sponsor: BASE_SPONSOR, tierSize: "eagle" });
    const img = screen.getByTestId("sponsor-logo-sp-1");
    expect(img).toHaveAttribute("alt", BASE_SPONSOR.name);
  });

  it("logo img does NOT have a grayscale class", () => {
    const { container } = renderCard({ sponsor: BASE_SPONSOR, tierSize: "eagle" });
    const img = screen.getByTestId("sponsor-logo-sp-1");
    // Check className string — no grayscale at any breakpoint
    expect(img.className).not.toMatch(/grayscale/);
    // Also check inline style for filter property
    expect(img.getAttribute("style") ?? "").not.toContain("grayscale");
    // Broad sweep: no grayscale anywhere in the rendered card subtree
    expect(container.innerHTML).not.toContain("grayscale");
  });
});

// ---------------------------------------------------------------------------
// Logo variant — link wrapping
// ---------------------------------------------------------------------------

describe("SponsorCard — logo variant link behaviour", () => {
  it("wraps card in <a> when website is set", () => {
    const { container } = renderCard({ sponsor: BASE_SPONSOR, tierSize: "eagle" });
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute("href", BASE_SPONSOR.website);
  });

  it("link has target=_blank", () => {
    const { container } = renderCard({ sponsor: BASE_SPONSOR, tierSize: "eagle" });
    const link = container.querySelector("a");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("link has rel=noopener noreferrer", () => {
    const { container } = renderCard({ sponsor: BASE_SPONSOR, tierSize: "eagle" });
    const link = container.querySelector("a");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders as <div> (not <a>) when website is null", () => {
    const { container } = renderCard({
      sponsor: NO_WEBSITE_SPONSOR,
      tierSize: "eagle",
    });
    const link = container.querySelector("a");
    expect(link).toBeNull();
    // The card wrapper should be a non-interactive div
    const card = screen.getByTestId("sponsor-card-logo-sp-3");
    expect(card.tagName.toLowerCase()).toBe("div");
  });
});

// ---------------------------------------------------------------------------
// Tier sizing — logo container heights
// ---------------------------------------------------------------------------

describe("SponsorCard — logo container height by tier", () => {
  it("champion tier: logo container has h-24 class (96px)", () => {
    const { container } = renderCard({
      sponsor: BASE_SPONSOR,
      tierSize: "champion",
    });
    const hasH24 = Array.from(container.querySelectorAll("*")).some(
      (el) => el.className && el.className.includes("h-24")
    );
    const hasInlineH96 = Array.from(container.querySelectorAll("*")).some(
      (el) => (el as HTMLElement).style?.height === "96px"
    );
    expect(hasH24 || hasInlineH96).toBe(true);
  });

  it("eagle tier: logo container has h-18 or h-[72px] class (72px)", () => {
    const { container } = renderCard({
      sponsor: BASE_SPONSOR,
      tierSize: "eagle",
    });
    const hasEagleHeight = Array.from(container.querySelectorAll("*")).some(
      (el) =>
        el.className &&
        (el.className.includes("h-18") || el.className.includes("h-[72px]"))
    );
    const hasInlineH72 = Array.from(container.querySelectorAll("*")).some(
      (el) => (el as HTMLElement).style?.height === "72px"
    );
    expect(hasEagleHeight || hasInlineH72).toBe(true);
  });

  it("standard tier: logo container has h-14 or h-[56px] class (~56px)", () => {
    const { container } = renderCard({
      sponsor: BASE_SPONSOR,
      tierSize: "standard",
    });
    const hasStandardHeight = Array.from(container.querySelectorAll("*")).some(
      (el) =>
        el.className &&
        (el.className.includes("h-14") || el.className.includes("h-[56px]"))
    );
    const hasInlineH56 = Array.from(container.querySelectorAll("*")).some(
      (el) => (el as HTMLElement).style?.height === "56px"
    );
    expect(hasStandardHeight || hasInlineH56).toBe(true);
  });

  it("compact tier: logo container has h-12 class (48px)", () => {
    const { container } = renderCard({
      sponsor: BASE_SPONSOR,
      tierSize: "compact",
    });
    const hasH12 = Array.from(container.querySelectorAll("*")).some(
      (el) => el.className && el.className.includes("h-12")
    );
    const hasInlineH48 = Array.from(container.querySelectorAll("*")).some(
      (el) => (el as HTMLElement).style?.height === "48px"
    );
    expect(hasH12 || hasInlineH48).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Champion tier accent
// ---------------------------------------------------------------------------

describe("SponsorCard — champion tier left-border accent", () => {
  it("champion tier: card or wrapper includes border-l-4 class", () => {
    const { container } = renderCard({
      sponsor: BASE_SPONSOR,
      tierSize: "champion",
    });
    const hasBorderL4 = Array.from(container.querySelectorAll("*")).some(
      (el) => el.className && el.className.includes("border-l-4")
    );
    expect(hasBorderL4).toBe(true);
  });

  it("eagle tier: no border-l-4 class anywhere", () => {
    const { container } = renderCard({
      sponsor: BASE_SPONSOR,
      tierSize: "eagle",
    });
    const hasBorderL4 = Array.from(container.querySelectorAll("*")).some(
      (el) => el.className && el.className.includes("border-l-4")
    );
    expect(hasBorderL4).toBe(false);
  });

  it("standard tier: no border-l-4 class anywhere", () => {
    const { container } = renderCard({
      sponsor: BASE_SPONSOR,
      tierSize: "standard",
    });
    const hasBorderL4 = Array.from(container.querySelectorAll("*")).some(
      (el) => el.className && el.className.includes("border-l-4")
    );
    expect(hasBorderL4).toBe(false);
  });

  it("compact tier: no border-l-4 class anywhere", () => {
    const { container } = renderCard({
      sponsor: BASE_SPONSOR,
      tierSize: "compact",
    });
    const hasBorderL4 = Array.from(container.querySelectorAll("*")).some(
      (el) => el.className && el.className.includes("border-l-4")
    );
    expect(hasBorderL4).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Text-fallback variant
// ---------------------------------------------------------------------------

describe("SponsorCard — text-fallback variant (null logo_url)", () => {
  it("renders data-testid=sponsor-card-text-{id} when logo_url is null", () => {
    renderCard({ sponsor: NO_LOGO_SPONSOR, tierSize: "eagle" });
    expect(screen.getByTestId("sponsor-card-text-sp-2")).toBeInTheDocument();
  });

  it("does NOT render data-testid=sponsor-card-logo-{id} when logo_url is null", () => {
    renderCard({ sponsor: NO_LOGO_SPONSOR, tierSize: "eagle" });
    expect(screen.queryByTestId("sponsor-card-logo-sp-2")).not.toBeInTheDocument();
  });

  it("does NOT render a sponsor-logo img when logo_url is null", () => {
    renderCard({ sponsor: NO_LOGO_SPONSOR, tierSize: "eagle" });
    expect(screen.queryByTestId("sponsor-logo-sp-2")).not.toBeInTheDocument();
  });

  it("text-fallback card contains the sponsor name", () => {
    renderCard({ sponsor: NO_LOGO_SPONSOR, tierSize: "eagle" });
    expect(screen.getByText(NO_LOGO_SPONSOR.name)).toBeInTheDocument();
  });

  it("text-fallback sponsor name has font-display class (Fraunces)", () => {
    renderCard({ sponsor: NO_LOGO_SPONSOR, tierSize: "eagle" });
    const nameEl = screen.getByText(NO_LOGO_SPONSOR.name);
    // Design spec: font-display (Fraunces). Not font-sans (old design).
    expect(nameEl.className).toContain("font-display");
  });

  it("text-fallback card has an ornamental rule element (h-px) above the name", () => {
    const { container } = renderCard({
      sponsor: NO_LOGO_SPONSOR,
      tierSize: "eagle",
    });
    const card = screen.getByTestId("sponsor-card-text-sp-2");
    // Ornamental rule: thin horizontal element with h-px above the name
    // Design spec: w-8 h-px bg-brand-muted mx-auto mb-3
    const hasOrnament = Array.from(card.querySelectorAll("*")).some(
      (el) =>
        el.className &&
        (el.className.includes("h-px") || el.className.includes("h-[1px]"))
    );
    expect(hasOrnament).toBe(true);
  });

  it("text-fallback card uses bg-cream (not bg-neutral-50)", () => {
    renderCard({ sponsor: NO_LOGO_SPONSOR, tierSize: "eagle" });
    const card = screen.getByTestId("sponsor-card-text-sp-2");
    const hasCream =
      card.className.includes("bg-cream") ||
      Array.from(card.querySelectorAll("*")).some(
        (el) => el.className && el.className.includes("bg-cream")
      );
    expect(hasCream).toBe(true);

    const hasNeutral50 =
      card.className.includes("bg-neutral-50") ||
      Array.from(card.querySelectorAll("*")).some(
        (el) => el.className && el.className.includes("bg-neutral-50")
      );
    expect(hasNeutral50).toBe(false);
  });

  it("text-fallback variant wraps in <a> when website is set", () => {
    const { container } = renderCard({
      sponsor: NO_LOGO_SPONSOR,
      tierSize: "eagle",
    });
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute("href", NO_LOGO_SPONSOR.website);
  });

  it("text-fallback variant renders as <div> when website is null", () => {
    const { container } = renderCard({
      sponsor: TEXT_NO_WEBSITE_SPONSOR,
      tierSize: "standard",
    });
    const link = container.querySelector("a");
    expect(link).toBeNull();
    const card = screen.getByTestId("sponsor-card-text-sp-4");
    expect(card.tagName.toLowerCase()).toBe("div");
  });
});

// ---------------------------------------------------------------------------
// No grayscale — invariant across all tiers and variants
// ---------------------------------------------------------------------------

describe("SponsorCard — no grayscale filter (invariant)", () => {
  const tiers = ["champion", "eagle", "standard", "compact"] as const;

  tiers.forEach((tier) => {
    it(`logo variant — no grayscale at ${tier} tier`, () => {
      const { container } = renderCard({
        sponsor: { ...BASE_SPONSOR, id: `sp-gs-${tier}` },
        tierSize: tier,
      });
      expect(container.innerHTML).not.toContain("grayscale");
    });
  });
});
