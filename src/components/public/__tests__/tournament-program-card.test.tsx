/**
 * tournament-program-card.test.tsx — RED tests for Tournament Program redesign (#227)
 *
 * Design spec: plans/sponsors-aesthetic-directions.md §Direction B
 * Replaces: the "Engraved Donor Wall" patron-card design (#226)
 *
 * All tests in this file should be RED against main@9c7f9da (component still
 * renders the old drop-initial patron design; tier strip does not exist yet).
 * They turn GREEN once Bolt implements the Tournament Program direction.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  TestID contract for Bolt (unified frame — both variants)       │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  sponsor-card-{id}         — unified card root (logo OR patron) │
 * │  tier-strip                — top color band (champion + eagle)  │
 * │  tier-strip-label          — text inside tier strip             │
 * │  tier-strip-diamond-left   — left ◆ ornament                    │
 * │  tier-strip-diamond-right  — right ◆ ornament                   │
 * │  double-rule               — container for both h-px divs       │
 * │  sponsor-logo-{id}         — <img> inside logo variant          │
 * │  patron-name               — name element in patron variant     │
 * │  patron-subline            — "Est. 2010 · Champion Patron"      │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * NOTE ON TESTID SCHEME: Bolt should use the UNIFIED `sponsor-card-{id}` root
 * testid for both logo and patron variants. The old split scheme
 * (sponsor-card-logo-{id} / sponsor-card-text-{id}) is retired. The existing
 * sponsor-card.test.tsx and sponsors-page.test.tsx still reference the OLD
 * testids — those files will need a separate update pass once the new component
 * ships. This file only uses the NEW unified testid.
 *
 * NOTE ON LOGO MAX-H vs H: The spec says max-h-24 / max-h-[72px] etc. These
 * are max-height constraints on the <img> element itself, not fixed heights on
 * a container div. Tests check for max-h-* on the img element or a direct parent.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll } from "vitest";

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
      "SponsorCard not found — Bolt needs to create src/components/public/sponsor-card.tsx (#227)"
    );
  }
  return render(<SponsorCard {...props} />);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Logo variants (logo_url is set)
const LOGO_CHAMPION = {
  id: "logo-champ-1",
  name: "Carolina East Medical",
  logo_url: "https://example.com/carolina-east.png",
  website: "https://carolinaeast.com",
};

const LOGO_EAGLE = {
  id: "logo-eagle-1",
  name: "Fuel Market",
  logo_url: "https://example.com/fuel-market.png",
  website: null,
};

const LOGO_STANDARD = {
  id: "logo-standard-1",
  name: "Century 21",
  logo_url: "https://example.com/century21.png",
  website: null,
};

const LOGO_COMPACT = {
  id: "logo-compact-1",
  name: "Local Bakery",
  logo_url: "https://example.com/local-bakery.png",
  website: null,
};

// Patron variants (logo_url is null)
const PATRON_CHAMPION = {
  id: "pat-champ-1",
  name: "Scottie Davenport",
  logo_url: null,
  website: "https://example.com",
};

const PATRON_CHAMPION_NO_LINK = {
  id: "pat-champ-2",
  name: "Scottie Davenport",
  logo_url: null,
  website: null,
};

const PATRON_EAGLE = {
  id: "pat-eagle-1",
  name: "Mike Evans",
  logo_url: null,
  website: null,
};

const PATRON_STANDARD = {
  id: "pat-std-1",
  name: "Jane Memorial Fund",
  logo_url: null,
  website: null,
};

const PATRON_COMPACT = {
  id: "pat-compact-1",
  name: "Friend of the Classic",
  logo_url: null,
  website: null,
};

// ===========================================================================
// 1. UNIFIED CARD ROOT — both variants use sponsor-card-{id}
// ===========================================================================

describe("Tournament Program — unified card root testid", () => {
  it("logo variant renders data-testid=sponsor-card-{id}", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    expect(screen.getByTestId(`sponsor-card-${LOGO_CHAMPION.id}`)).toBeInTheDocument();
  });

  it("patron variant renders data-testid=sponsor-card-{id}", () => {
    renderCard({ sponsor: PATRON_CHAMPION, tierSize: "champion" });
    expect(screen.getByTestId(`sponsor-card-${PATRON_CHAMPION.id}`)).toBeInTheDocument();
  });

  it("null logo_url renders patron variant (not logo variant)", () => {
    renderCard({ sponsor: PATRON_CHAMPION, tierSize: "champion" });
    // Must have the unified root
    expect(screen.getByTestId(`sponsor-card-${PATRON_CHAMPION.id}`)).toBeInTheDocument();
    // Must NOT render a sponsor-logo- img
    expect(screen.queryByTestId(`sponsor-logo-${PATRON_CHAMPION.id}`)).not.toBeInTheDocument();
  });

  it("non-null logo_url renders logo variant with sponsor-logo-{id} img", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    expect(screen.getByTestId(`sponsor-logo-${LOGO_CHAMPION.id}`)).toBeInTheDocument();
  });
});

// ===========================================================================
// 2. TIER STRIP — Champion
// ===========================================================================

describe("Tournament Program — Champion tier strip", () => {
  it("renders data-testid=tier-strip on champion logo card", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    expect(screen.getByTestId("tier-strip")).toBeInTheDocument();
  });

  it("renders data-testid=tier-strip on champion patron card", () => {
    renderCard({ sponsor: PATRON_CHAMPION, tierSize: "champion" });
    expect(screen.getByTestId("tier-strip")).toBeInTheDocument();
  });

  it("champion tier-strip has bg-brand class", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const strip = screen.getByTestId("tier-strip");
    expect(strip.className).toContain("bg-brand");
  });

  it("champion tier-strip has text-white class", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const strip = screen.getByTestId("tier-strip");
    expect(strip.className).toContain("text-white");
  });

  it("champion tier-strip label has text 'CHAMPION SPONSOR' (uppercase tracked Manrope)", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const label = screen.getByTestId("tier-strip-label");
    expect(label.textContent?.toUpperCase()).toContain("CHAMPION");
  });

  it("champion tier-strip label has uppercase class", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const label = screen.getByTestId("tier-strip-label");
    expect(label.className).toContain("uppercase");
  });

  it("champion tier-strip renders left diamond span with ◆", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const diamond = screen.getByTestId("tier-strip-diamond-left");
    expect(diamond).toBeInTheDocument();
    expect(diamond.textContent).toContain("◆");
  });

  it("champion tier-strip renders right diamond span with ◆", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const diamond = screen.getByTestId("tier-strip-diamond-right");
    expect(diamond).toBeInTheDocument();
    expect(diamond.textContent).toContain("◆");
  });

  it("champion left diamond is aria-hidden (decorative)", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    expect(screen.getByTestId("tier-strip-diamond-left")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
  });

  it("champion right diamond is aria-hidden (decorative)", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    expect(screen.getByTestId("tier-strip-diamond-right")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
  });

  it("champion tier-strip label is NOT aria-hidden (screen readers should read it)", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const label = screen.getByTestId("tier-strip-label");
    expect(label.getAttribute("aria-hidden")).not.toBe("true");
  });

  it("champion diamonds use --accent-gold custom property (inline style or text-accent-gold class)", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const diamond = screen.getByTestId("tier-strip-diamond-left") as HTMLElement;
    const hasGoldStyle =
      diamond.style.color === "var(--accent-gold)" ||
      diamond.className.includes("text-accent-gold") ||
      diamond.className.includes("accent-gold");
    expect(hasGoldStyle).toBe(true);
  });

  it("champion diamonds do NOT use hardcoded hex #C9A84C (must be CSS var)", () => {
    const { container } = renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    // Inline styles should use var(--accent-gold), not literal hex
    expect(container.innerHTML).not.toContain("#C9A84C");
  });
});

// ===========================================================================
// 3. TIER STRIP — Eagle
// ===========================================================================

describe("Tournament Program — Eagle tier strip", () => {
  it("renders data-testid=tier-strip on eagle logo card", () => {
    renderCard({ sponsor: LOGO_EAGLE, tierSize: "eagle" });
    expect(screen.getByTestId("tier-strip")).toBeInTheDocument();
  });

  it("renders data-testid=tier-strip on eagle patron card", () => {
    renderCard({ sponsor: PATRON_EAGLE, tierSize: "eagle" });
    expect(screen.getByTestId("tier-strip")).toBeInTheDocument();
  });

  it("eagle tier-strip has bg-brand-muted class (one step down from champion)", () => {
    renderCard({ sponsor: LOGO_EAGLE, tierSize: "eagle" });
    const strip = screen.getByTestId("tier-strip");
    expect(strip.className).toContain("bg-brand-muted");
  });

  it("eagle tier-strip has text-brand class", () => {
    renderCard({ sponsor: LOGO_EAGLE, tierSize: "eagle" });
    const strip = screen.getByTestId("tier-strip");
    expect(strip.className).toContain("text-brand");
  });

  it("eagle tier-strip label text contains EAGLE", () => {
    renderCard({ sponsor: LOGO_EAGLE, tierSize: "eagle" });
    const label = screen.getByTestId("tier-strip-label");
    expect(label.textContent?.toUpperCase()).toContain("EAGLE");
  });

  it("eagle tier-strip renders gold diamonds flanking the label", () => {
    renderCard({ sponsor: LOGO_EAGLE, tierSize: "eagle" });
    expect(screen.getByTestId("tier-strip-diamond-left").textContent).toContain("◆");
    expect(screen.getByTestId("tier-strip-diamond-right").textContent).toContain("◆");
  });

  it("eagle diamonds are aria-hidden", () => {
    renderCard({ sponsor: LOGO_EAGLE, tierSize: "eagle" });
    expect(screen.getByTestId("tier-strip-diamond-left")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("tier-strip-diamond-right")).toHaveAttribute("aria-hidden", "true");
  });
});

// ===========================================================================
// 4. TIER STRIP — Standard and Compact (must NOT have tier strip)
// ===========================================================================

describe("Tournament Program — Standard and Compact have NO tier strip", () => {
  it("standard logo card: NO tier-strip", () => {
    renderCard({ sponsor: LOGO_STANDARD, tierSize: "standard" });
    expect(screen.queryByTestId("tier-strip")).not.toBeInTheDocument();
  });

  it("standard patron card: NO tier-strip", () => {
    renderCard({ sponsor: PATRON_STANDARD, tierSize: "standard" });
    expect(screen.queryByTestId("tier-strip")).not.toBeInTheDocument();
  });

  it("compact logo card: NO tier-strip", () => {
    renderCard({ sponsor: LOGO_COMPACT, tierSize: "compact" });
    expect(screen.queryByTestId("tier-strip")).not.toBeInTheDocument();
  });

  it("compact patron card: NO tier-strip", () => {
    renderCard({ sponsor: PATRON_COMPACT, tierSize: "compact" });
    expect(screen.queryByTestId("tier-strip")).not.toBeInTheDocument();
  });
});

// ===========================================================================
// 5. DOUBLE RULE — Champion and Eagle only
// ===========================================================================

describe("Tournament Program — double rule beneath tier strip", () => {
  it("champion logo card: double-rule container exists", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    expect(screen.getByTestId("double-rule")).toBeInTheDocument();
  });

  it("champion patron card: double-rule container exists", () => {
    renderCard({ sponsor: PATRON_CHAMPION, tierSize: "champion" });
    expect(screen.getByTestId("double-rule")).toBeInTheDocument();
  });

  it("eagle logo card: double-rule container exists", () => {
    renderCard({ sponsor: LOGO_EAGLE, tierSize: "eagle" });
    expect(screen.getByTestId("double-rule")).toBeInTheDocument();
  });

  it("eagle patron card: double-rule container exists", () => {
    renderCard({ sponsor: PATRON_EAGLE, tierSize: "eagle" });
    expect(screen.getByTestId("double-rule")).toBeInTheDocument();
  });

  it("champion double-rule contains exactly 2 child divs with h-px", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const doubleRule = screen.getByTestId("double-rule");
    const hpxDivs = Array.from(doubleRule.querySelectorAll("div")).filter(
      (el) => el.className.includes("h-px")
    );
    expect(hpxDivs.length).toBe(2);
  });

  it("champion double-rule first div has bg-brand", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const doubleRule = screen.getByTestId("double-rule");
    const hpxDivs = Array.from(doubleRule.querySelectorAll("div")).filter(
      (el) => el.className.includes("h-px")
    );
    expect(hpxDivs[0].className).toContain("bg-brand");
  });

  it("champion double-rule second div has bg-brand-muted and mt-0.5", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const doubleRule = screen.getByTestId("double-rule");
    const hpxDivs = Array.from(doubleRule.querySelectorAll("div")).filter(
      (el) => el.className.includes("h-px")
    );
    expect(hpxDivs[1].className).toContain("bg-brand-muted");
    expect(hpxDivs[1].className).toContain("mt-0.5");
  });

  it("double-rule container is aria-hidden (purely decorative)", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const doubleRule = screen.getByTestId("double-rule");
    expect(doubleRule).toHaveAttribute("aria-hidden", "true");
  });

  it("standard logo card: NO double-rule", () => {
    renderCard({ sponsor: LOGO_STANDARD, tierSize: "standard" });
    expect(screen.queryByTestId("double-rule")).not.toBeInTheDocument();
  });

  it("compact patron card: NO double-rule", () => {
    renderCard({ sponsor: PATRON_COMPACT, tierSize: "compact" });
    expect(screen.queryByTestId("double-rule")).not.toBeInTheDocument();
  });
});

// ===========================================================================
// 6. CARD BACKGROUND — bg-cream grain-overlay on all tiers
// ===========================================================================

describe("Tournament Program — card background classes", () => {
  const allCases: Array<{
    label: string;
    sponsor: { id: string; name: string; logo_url: string | null; website: string | null };
    tierSize: "champion" | "eagle" | "standard" | "compact";
  }> = [
    { label: "champion logo", sponsor: LOGO_CHAMPION, tierSize: "champion" },
    { label: "champion patron", sponsor: PATRON_CHAMPION, tierSize: "champion" },
    { label: "eagle logo", sponsor: LOGO_EAGLE, tierSize: "eagle" },
    { label: "eagle patron", sponsor: PATRON_EAGLE, tierSize: "eagle" },
    { label: "standard logo", sponsor: LOGO_STANDARD, tierSize: "standard" },
    { label: "standard patron", sponsor: PATRON_STANDARD, tierSize: "standard" },
    { label: "compact logo", sponsor: LOGO_COMPACT, tierSize: "compact" },
    { label: "compact patron", sponsor: PATRON_COMPACT, tierSize: "compact" },
  ];

  allCases.forEach(({ label, sponsor, tierSize }) => {
    it(`${label}: card has bg-cream class`, () => {
      const { container } = renderCard({ sponsor, tierSize });
      expect(container.innerHTML).toContain("bg-cream");
    });
  });

  it("champion logo: has grain-overlay class", () => {
    const { container } = renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    expect(container.innerHTML).toContain("grain-overlay");
  });

  it("eagle patron: has grain-overlay class", () => {
    const { container } = renderCard({ sponsor: PATRON_EAGLE, tierSize: "eagle" });
    expect(container.innerHTML).toContain("grain-overlay");
  });

  it("champion card: has border-t-2 border-t-brand (thick top rule)", () => {
    const { container } = renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const hasThickTop = Array.from(container.querySelectorAll("*")).some(
      (el) => el.className && el.className.includes("border-t-2")
    );
    expect(hasThickTop).toBe(true);
  });

  it("compact patron: has border-l-2 left accent", () => {
    const { container } = renderCard({ sponsor: PATRON_COMPACT, tierSize: "compact" });
    const hasBorderL2 = Array.from(container.querySelectorAll("*")).some(
      (el) => el.className && el.className.includes("border-l-2")
    );
    expect(hasBorderL2).toBe(true);
  });

  it("compact logo: has border-l-2 left accent (compact uses left-border, not top-border)", () => {
    const { container } = renderCard({ sponsor: LOGO_COMPACT, tierSize: "compact" });
    const hasBorderL2 = Array.from(container.querySelectorAll("*")).some(
      (el) => el.className && el.className.includes("border-l-2")
    );
    expect(hasBorderL2).toBe(true);
  });

  it("standard card does NOT have border-t-2 (no thick top rule)", () => {
    const { container } = renderCard({ sponsor: LOGO_STANDARD, tierSize: "standard" });
    const hasBorderT2 = Array.from(container.querySelectorAll("*")).some(
      (el) => el.className && el.className.includes("border-t-2")
    );
    expect(hasBorderT2).toBe(false);
  });
});

// ===========================================================================
// 7. UNIFIED FRAME — logo and patron variants share same DOM shape above content
// ===========================================================================

describe("Tournament Program — unified frame: logo and patron share same outer structure", () => {
  it("champion logo card and champion patron card both have a tier-strip", () => {
    const { unmount } = renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    expect(screen.getByTestId("tier-strip")).toBeInTheDocument();
    unmount();

    renderCard({ sponsor: PATRON_CHAMPION, tierSize: "champion" });
    expect(screen.getByTestId("tier-strip")).toBeInTheDocument();
  });

  it("champion logo card and champion patron card both have a double-rule", () => {
    const { unmount } = renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    expect(screen.getByTestId("double-rule")).toBeInTheDocument();
    unmount();

    renderCard({ sponsor: PATRON_CHAMPION, tierSize: "champion" });
    expect(screen.getByTestId("double-rule")).toBeInTheDocument();
  });

  it("eagle logo card and eagle patron card both have a tier-strip", () => {
    const { unmount } = renderCard({ sponsor: LOGO_EAGLE, tierSize: "eagle" });
    expect(screen.getByTestId("tier-strip")).toBeInTheDocument();
    unmount();

    renderCard({ sponsor: PATRON_EAGLE, tierSize: "eagle" });
    expect(screen.getByTestId("tier-strip")).toBeInTheDocument();
  });

  it("eagle logo card and eagle patron card both have a double-rule", () => {
    const { unmount } = renderCard({ sponsor: LOGO_EAGLE, tierSize: "eagle" });
    expect(screen.getByTestId("double-rule")).toBeInTheDocument();
    unmount();

    renderCard({ sponsor: PATRON_EAGLE, tierSize: "eagle" });
    expect(screen.getByTestId("double-rule")).toBeInTheDocument();
  });
});

// ===========================================================================
// 8. LOGO VARIANT — image + sub-line
// ===========================================================================

describe("Tournament Program — logo variant content", () => {
  it("logo img has data-testid=sponsor-logo-{id}", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    expect(screen.getByTestId(`sponsor-logo-${LOGO_CHAMPION.id}`)).toBeInTheDocument();
  });

  it("logo img has correct src", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const img = screen.getByTestId(`sponsor-logo-${LOGO_CHAMPION.id}`);
    expect(img).toHaveAttribute("src", LOGO_CHAMPION.logo_url);
  });

  it("logo img has alt set to sponsor.name", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const img = screen.getByTestId(`sponsor-logo-${LOGO_CHAMPION.id}`);
    expect(img).toHaveAttribute("alt", LOGO_CHAMPION.name);
  });

  it("logo img has object-contain class", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const img = screen.getByTestId(`sponsor-logo-${LOGO_CHAMPION.id}`);
    expect(img.className).toContain("object-contain");
  });

  it("champion logo: logo container or img has max-h-24 (96px)", () => {
    const { container } = renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const img = screen.getByTestId(`sponsor-logo-${LOGO_CHAMPION.id}`);
    const hasMaxH24 =
      img.className.includes("max-h-24") ||
      (img.parentElement?.className ?? "").includes("max-h-24") ||
      Array.from(container.querySelectorAll("*")).some(
        (el) => el.className && el.className.includes("max-h-24")
      );
    expect(hasMaxH24).toBe(true);
  });

  it("eagle logo: logo container or img has max-h-[72px]", () => {
    const { container } = renderCard({ sponsor: LOGO_EAGLE, tierSize: "eagle" });
    const img = screen.getByTestId(`sponsor-logo-${LOGO_EAGLE.id}`);
    const hasMaxHEagle =
      img.className.includes("max-h-[72px]") ||
      (img.parentElement?.className ?? "").includes("max-h-[72px]") ||
      Array.from(container.querySelectorAll("*")).some(
        (el) => el.className && el.className.includes("max-h-[72px]")
      );
    expect(hasMaxHEagle).toBe(true);
  });

  it("standard logo: logo container or img has max-h-14 (56px)", () => {
    const { container } = renderCard({ sponsor: LOGO_STANDARD, tierSize: "standard" });
    const img = screen.getByTestId(`sponsor-logo-${LOGO_STANDARD.id}`);
    const hasMaxH14 =
      img.className.includes("max-h-14") ||
      (img.parentElement?.className ?? "").includes("max-h-14") ||
      Array.from(container.querySelectorAll("*")).some(
        (el) => el.className && el.className.includes("max-h-14")
      );
    expect(hasMaxH14).toBe(true);
  });

  it("compact logo: logo container or img has max-h-12 (48px)", () => {
    const { container } = renderCard({ sponsor: LOGO_COMPACT, tierSize: "compact" });
    const img = screen.getByTestId(`sponsor-logo-${LOGO_COMPACT.id}`);
    const hasMaxH12 =
      img.className.includes("max-h-12") ||
      (img.parentElement?.className ?? "").includes("max-h-12") ||
      Array.from(container.querySelectorAll("*")).some(
        (el) => el.className && el.className.includes("max-h-12")
      );
    expect(hasMaxH12).toBe(true);
  });

  it("logo is left-aligned — logo container uses justify-start or items-start (not centered)", () => {
    const { container } = renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const hasLeftAlign = Array.from(container.querySelectorAll("*")).some(
      (el) =>
        el.className &&
        (el.className.includes("justify-start") ||
          el.className.includes("items-start") ||
          el.className.includes("text-left"))
    );
    // Must NOT be items-center or justify-center on the direct logo wrapper
    const img = screen.getByTestId(`sponsor-logo-${LOGO_CHAMPION.id}`);
    const logoWrapper = img.parentElement;
    const isCentered =
      (logoWrapper?.className ?? "").includes("items-center") ||
      (logoWrapper?.className ?? "").includes("justify-center") ||
      (logoWrapper?.className ?? "").includes("mx-auto");
    expect(hasLeftAlign).toBe(true);
    expect(isCentered).toBe(false);
  });

  it("champion logo sub-line: sponsor name in Manrope uppercase tracked", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const card = screen.getByTestId(`sponsor-card-${LOGO_CHAMPION.id}`);
    // Sub-line should contain the sponsor name text
    const sublineEl = Array.from(card.querySelectorAll("*")).find(
      (el) =>
        el.textContent?.includes(LOGO_CHAMPION.name) &&
        el.className &&
        (el.className.includes("uppercase") ||
          el.className.includes("tracking-") ||
          el.className.includes("font-sans"))
    );
    expect(sublineEl).toBeTruthy();
  });

  it("logo variant sub-line is aria-hidden (decorative secondary info)", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const card = screen.getByTestId(`sponsor-card-${LOGO_CHAMPION.id}`);
    // Find elements containing the sponsor name that are aria-hidden
    const ariaHiddenSubline = Array.from(card.querySelectorAll("[aria-hidden='true']")).some(
      (el) => el.textContent?.includes(LOGO_CHAMPION.name)
    );
    expect(ariaHiddenSubline).toBe(true);
  });
});

// ===========================================================================
// 9. PATRON VARIANT — name + sub-line typography
// ===========================================================================

describe("Tournament Program — patron variant content", () => {
  it("patron name element has data-testid=patron-name", () => {
    renderCard({ sponsor: PATRON_CHAMPION, tierSize: "champion" });
    expect(screen.getByTestId("patron-name")).toBeInTheDocument();
  });

  it("patron name element contains sponsor.name text", () => {
    renderCard({ sponsor: PATRON_CHAMPION, tierSize: "champion" });
    const el = screen.getByTestId("patron-name");
    expect(el.textContent).toContain(PATRON_CHAMPION.name);
  });

  it("patron name element has font-display class (Fraunces)", () => {
    renderCard({ sponsor: PATRON_CHAMPION, tierSize: "champion" });
    const el = screen.getByTestId("patron-name");
    expect(el.className).toContain("font-display");
  });

  it("champion patron name: fontVariationSettings contains 'opsz' 72", () => {
    renderCard({ sponsor: PATRON_CHAMPION, tierSize: "champion" });
    const el = screen.getByTestId("patron-name") as HTMLElement;
    expect(el.style.fontVariationSettings).toContain("'opsz' 72");
  });

  it("champion patron name: fontWeight is 500", () => {
    renderCard({ sponsor: PATRON_CHAMPION, tierSize: "champion" });
    const el = screen.getByTestId("patron-name") as HTMLElement;
    // fontWeight can be inline style (string "500") or numeric 500
    expect(el.style.fontWeight).toBe("500");
  });

  it("champion patron name: is NOT italic (italic reserved for Eagle)", () => {
    renderCard({ sponsor: PATRON_CHAMPION, tierSize: "champion" });
    const el = screen.getByTestId("patron-name");
    // Must not have italic class or inline fontStyle
    expect(el.className).not.toContain("italic");
    expect((el as HTMLElement).style.fontStyle).not.toBe("italic");
  });

  it("champion patron name: has text-[28px] or sm:text-[36px] responsive sizing", () => {
    renderCard({ sponsor: PATRON_CHAMPION, tierSize: "champion" });
    const el = screen.getByTestId("patron-name");
    const hasSize =
      el.className.includes("text-[28px]") || el.className.includes("text-[36px]");
    expect(hasSize).toBe(true);
  });

  it("eagle patron name: fontVariationSettings contains 'opsz' 36", () => {
    renderCard({ sponsor: PATRON_EAGLE, tierSize: "eagle" });
    const el = screen.getByTestId("patron-name") as HTMLElement;
    expect(el.style.fontVariationSettings).toContain("'opsz' 36");
  });

  it("eagle patron name: is italic", () => {
    renderCard({ sponsor: PATRON_EAGLE, tierSize: "eagle" });
    const el = screen.getByTestId("patron-name");
    const isItalic =
      el.className.includes("italic") ||
      (el as HTMLElement).style.fontStyle === "italic";
    expect(isItalic).toBe(true);
  });

  it("eagle patron name: fontWeight is 400", () => {
    renderCard({ sponsor: PATRON_EAGLE, tierSize: "eagle" });
    const el = screen.getByTestId("patron-name") as HTMLElement;
    expect(el.style.fontWeight).toBe("400");
  });

  it("standard patron name: fontVariationSettings contains 'opsz' 36", () => {
    renderCard({ sponsor: PATRON_STANDARD, tierSize: "standard" });
    const el = screen.getByTestId("patron-name") as HTMLElement;
    expect(el.style.fontVariationSettings).toContain("'opsz' 36");
  });

  it("standard patron name: is NOT italic (italic is Eagle-only)", () => {
    renderCard({ sponsor: PATRON_STANDARD, tierSize: "standard" });
    const el = screen.getByTestId("patron-name");
    expect(el.className).not.toContain("italic");
    expect((el as HTMLElement).style.fontStyle).not.toBe("italic");
  });

  it("compact patron name: fontVariationSettings contains 'opsz' 9", () => {
    renderCard({ sponsor: PATRON_COMPACT, tierSize: "compact" });
    const el = screen.getByTestId("patron-name") as HTMLElement;
    expect(el.style.fontVariationSettings).toContain("'opsz' 9");
  });

  it("champion patron sub-line data-testid=patron-subline exists", () => {
    renderCard({ sponsor: PATRON_CHAMPION, tierSize: "champion" });
    expect(screen.getByTestId("patron-subline")).toBeInTheDocument();
  });

  it("champion patron sub-line contains 'Est. 2010'", () => {
    renderCard({ sponsor: PATRON_CHAMPION, tierSize: "champion" });
    const el = screen.getByTestId("patron-subline");
    expect(el.textContent).toContain("Est. 2010");
  });

  it("champion patron sub-line contains 'Champion Patron'", () => {
    renderCard({ sponsor: PATRON_CHAMPION, tierSize: "champion" });
    const el = screen.getByTestId("patron-subline");
    expect(el.textContent).toContain("Champion Patron");
  });

  it("patron sub-line is aria-hidden (decorative secondary info)", () => {
    renderCard({ sponsor: PATRON_CHAMPION, tierSize: "champion" });
    const el = screen.getByTestId("patron-subline");
    expect(el).toHaveAttribute("aria-hidden", "true");
  });

  it("patron sub-line has uppercase class (Manrope tracked uppercase)", () => {
    renderCard({ sponsor: PATRON_CHAMPION, tierSize: "champion" });
    const el = screen.getByTestId("patron-subline");
    expect(el.className).toContain("uppercase");
  });
});

// ===========================================================================
// 10. ACCESSIBILITY
// ===========================================================================

describe("Tournament Program — accessibility", () => {
  it("patron name is accessible to screen readers (not aria-hidden)", () => {
    renderCard({ sponsor: PATRON_CHAMPION, tierSize: "champion" });
    const el = screen.getByTestId("patron-name");
    expect(el.getAttribute("aria-hidden")).not.toBe("true");
  });

  it("sponsor name text is visible to screen reader (logo variant — via img alt)", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const img = screen.getByTestId(`sponsor-logo-${LOGO_CHAMPION.id}`);
    expect(img).toHaveAttribute("alt", LOGO_CHAMPION.name);
  });

  it("tier-strip label is NOT aria-hidden (champion)", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const label = screen.getByTestId("tier-strip-label");
    expect(label.getAttribute("aria-hidden")).not.toBe("true");
  });

  it("tier-strip label is NOT aria-hidden (eagle)", () => {
    renderCard({ sponsor: PATRON_EAGLE, tierSize: "eagle" });
    const label = screen.getByTestId("tier-strip-label");
    expect(label.getAttribute("aria-hidden")).not.toBe("true");
  });

  it("double-rule is aria-hidden (champion)", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    expect(screen.getByTestId("double-rule")).toHaveAttribute("aria-hidden", "true");
  });

  it("diamond ornaments are aria-hidden (champion)", () => {
    renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    expect(screen.getByTestId("tier-strip-diamond-left")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("tier-strip-diamond-right")).toHaveAttribute("aria-hidden", "true");
  });
});

// ===========================================================================
// 11. LINK WRAPPING — regression
// ===========================================================================

describe("Tournament Program — link wrapping", () => {
  it("wraps card in <a> with href when website is set (patron)", () => {
    const { container } = renderCard({ sponsor: PATRON_CHAMPION, tierSize: "champion" });
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute("href", PATRON_CHAMPION.website);
  });

  it("wraps card in <a> with href when website is set (logo)", () => {
    const { container } = renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute("href", LOGO_CHAMPION.website);
  });

  it("link has target=_blank", () => {
    const { container } = renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const link = container.querySelector("a");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("link has rel=noopener noreferrer", () => {
    const { container } = renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    const link = container.querySelector("a");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders as <div> (not <a>) when website is null (patron)", () => {
    const { container } = renderCard({ sponsor: PATRON_CHAMPION_NO_LINK, tierSize: "champion" });
    const link = container.querySelector("a");
    expect(link).toBeNull();
    const card = screen.getByTestId(`sponsor-card-${PATRON_CHAMPION_NO_LINK.id}`);
    expect(card.tagName.toLowerCase()).toBe("div");
  });
});

// ===========================================================================
// 12. GOLD TOKEN — no hardcoded hex anywhere
// ===========================================================================

describe("Tournament Program — gold token discipline", () => {
  it("champion card: no hardcoded hex #C9A84C in the DOM", () => {
    const { container } = renderCard({ sponsor: LOGO_CHAMPION, tierSize: "champion" });
    expect(container.innerHTML).not.toContain("#C9A84C");
  });

  it("eagle card: no hardcoded hex #C9A84C in the DOM", () => {
    const { container } = renderCard({ sponsor: LOGO_EAGLE, tierSize: "eagle" });
    expect(container.innerHTML).not.toContain("#C9A84C");
  });
});

// ===========================================================================
// 13. NO GRAYSCALE — invariant
// ===========================================================================

describe("Tournament Program — no grayscale filter (invariant)", () => {
  const tiers = ["champion", "eagle", "standard", "compact"] as const;

  tiers.forEach((tier) => {
    it(`logo variant — no grayscale at ${tier} tier`, () => {
      const id = `gs-${tier}`;
      const { container } = renderCard({
        sponsor: { id, name: "Test Co", logo_url: "https://example.com/logo.png", website: null },
        tierSize: tier,
      });
      expect(container.innerHTML).not.toContain("grayscale");
    });
  });
});
