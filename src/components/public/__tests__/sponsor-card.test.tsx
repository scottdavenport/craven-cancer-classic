/**
 * sponsor-card.test.tsx — updated for Tournament Program redesign (#227)
 *
 * Switched from the split testid scheme (sponsor-card-logo-{id} /
 * sponsor-card-text-{id}) to the unified scheme (sponsor-card-{id}).
 * Old aesthetic assertions (border-l-4 champion accent, exact h-* logo
 * container heights, patron ornamental rule, dropcap) removed — those
 * tests now live in tournament-program-card.test.tsx.
 *
 * Tests retained here cover:
 *   - Unified root testid exists for both logo and patron variants
 *   - Link wrapping (website → <a>, null → <div>)
 *   - Logo img src / alt / object-contain
 *   - No grayscale filter (invariant)
 *   - Patron variant: sponsor name present + font-display class
 *   - Patron variant: bg-cream somewhere in card
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
        "Bolt needs to create src/components/public/sponsor-card.tsx (RED test — #220)"
    );
  }
  return render(<SponsorCard {...props} />);
}

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

describe("SponsorCard — unified card root testid", () => {
  it("renders data-testid=sponsor-card-{id} when logo_url is set", () => {
    renderCard({ sponsor: BASE_SPONSOR, tierSize: "eagle" });
    expect(screen.getByTestId("sponsor-card-sp-1")).toBeInTheDocument();
  });

  it("renders data-testid=sponsor-card-{id} when logo_url is null (patron variant)", () => {
    renderCard({ sponsor: NO_LOGO_SPONSOR, tierSize: "eagle" });
    expect(screen.getByTestId("sponsor-card-sp-2")).toBeInTheDocument();
  });

  it("does NOT render old split testid sponsor-card-logo-{id}", () => {
    renderCard({ sponsor: BASE_SPONSOR, tierSize: "eagle" });
    expect(screen.queryByTestId("sponsor-card-logo-sp-1")).not.toBeInTheDocument();
  });

  it("does NOT render old split testid sponsor-card-text-{id}", () => {
    renderCard({ sponsor: NO_LOGO_SPONSOR, tierSize: "eagle" });
    expect(screen.queryByTestId("sponsor-card-text-sp-2")).not.toBeInTheDocument();
  });
});

describe("SponsorCard — logo variant", () => {
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

  it("logo img has object-contain class", () => {
    renderCard({ sponsor: BASE_SPONSOR, tierSize: "eagle" });
    const img = screen.getByTestId("sponsor-logo-sp-1");
    expect(img.className).toContain("object-contain");
  });

  it("logo img does NOT have a grayscale class", () => {
    const { container } = renderCard({ sponsor: BASE_SPONSOR, tierSize: "eagle" });
    expect(container.innerHTML).not.toContain("grayscale");
  });
});

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
    const { container } = renderCard({ sponsor: NO_WEBSITE_SPONSOR, tierSize: "eagle" });
    const link = container.querySelector("a");
    expect(link).toBeNull();
    const card = screen.getByTestId("sponsor-card-sp-3");
    expect(card.tagName.toLowerCase()).toBe("div");
  });
});

describe("SponsorCard — patron variant (null logo_url)", () => {
  it("does NOT render a sponsor-logo img when logo_url is null", () => {
    renderCard({ sponsor: NO_LOGO_SPONSOR, tierSize: "eagle" });
    expect(screen.queryByTestId("sponsor-logo-sp-2")).not.toBeInTheDocument();
  });

  it("patron card contains the sponsor name", () => {
    renderCard({ sponsor: NO_LOGO_SPONSOR, tierSize: "eagle" });
    expect(screen.getByText(NO_LOGO_SPONSOR.name)).toBeInTheDocument();
  });

  it("patron name has font-display class (Fraunces)", () => {
    renderCard({ sponsor: NO_LOGO_SPONSOR, tierSize: "eagle" });
    const el = screen.getByTestId("patron-name");
    expect(el.className).toContain("font-display");
  });

  it("patron card has bg-cream somewhere in DOM", () => {
    const { container } = renderCard({ sponsor: NO_LOGO_SPONSOR, tierSize: "eagle" });
    const hasCream = container.innerHTML.includes("bg-cream");
    expect(hasCream).toBe(true);
  });

  it("patron card does NOT use bg-neutral-50", () => {
    const { container } = renderCard({ sponsor: NO_LOGO_SPONSOR, tierSize: "eagle" });
    expect(container.innerHTML).not.toContain("bg-neutral-50");
  });

  it("patron variant wraps in <a> when website is set", () => {
    const { container } = renderCard({ sponsor: NO_LOGO_SPONSOR, tierSize: "eagle" });
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute("href", NO_LOGO_SPONSOR.website);
  });

  it("patron variant renders as <div> when website is null", () => {
    const { container } = renderCard({ sponsor: TEXT_NO_WEBSITE_SPONSOR, tierSize: "standard" });
    const link = container.querySelector("a");
    expect(link).toBeNull();
    const card = screen.getByTestId("sponsor-card-sp-4");
    expect(card.tagName.toLowerCase()).toBe("div");
  });
});

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
