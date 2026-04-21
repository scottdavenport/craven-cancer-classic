/**
 * RED integration tests for the public SponsorsPage — #220 Public Sponsors Redesign
 *
 * These tests describe the TARGET layout state after Bolt's redesign.
 * They will FAIL against current main because:
 *   - The page has no data-testid attributes
 *   - The header uses bg-[#1A2E3A] (dark), not bg-cream grain-overlay
 *   - The CTA uses bg-neutral-50, not bg-[#1A2E3A] grain-overlay
 *   - Tier sections have no data-testid="tier-section-{id}"
 *   - SponsorCard component does not exist (tier-routing not yet implemented)
 *   - Grayscale filter is present on logo images
 *
 * Design spec: plans/public-sponsors-redesign.md
 * Mock pattern follows: src/app/admin/sponsors/__tests__/actions-getSponsors.test.ts
 */

import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Module-level mocks — hoisted
// ---------------------------------------------------------------------------

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock next/image — jsdom can't resolve Next Image optimization pipeline
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
// Stub data
// ---------------------------------------------------------------------------

const STUB_TIERS = [
  { id: "tier-champion", name: "Champion Sponsor", sort_order: 1, active: true },
  { id: "tier-eagle", name: "Eagle Sponsor", sort_order: 2, active: true },
  { id: "tier-morning-biscuit", name: "Morning Biscuit", sort_order: 3, active: true },
  { id: "tier-shot-of-the-day", name: "Shot of the Day", sort_order: 4, active: true },
];

const STUB_SPONSORS = [
  // Champion tier
  {
    id: "sp-champ-1",
    name: "Greenfield Medical",
    logo_url: "https://example.com/greenfield.png",
    website: "https://greenfield.com",
    tier_id: "tier-champion",
    year: 2026,
    is_active: true,
    deleted_at: null,
    display_order: 1,
  },
  {
    id: "sp-champ-2",
    name: "Atlantic Health",
    logo_url: null,
    website: null,
    tier_id: "tier-champion",
    year: 2026,
    is_active: true,
    deleted_at: null,
    display_order: 2,
  },
  // Eagle tier
  {
    id: "sp-eagle-1",
    name: "Sunrise Bank",
    logo_url: "https://example.com/sunrise.png",
    website: "https://sunrisebank.com",
    tier_id: "tier-eagle",
    year: 2026,
    is_active: true,
    deleted_at: null,
    display_order: 3,
  },
  // Morning Biscuit tier
  {
    id: "sp-mb-1",
    name: "Corner Bakery Co",
    logo_url: "https://example.com/cornerbakery.png",
    website: "https://cornerbakery.com",
    tier_id: "tier-morning-biscuit",
    year: 2026,
    is_active: true,
    deleted_at: null,
    display_order: 4,
  },
  // Shot of the Day tier
  {
    id: "sp-sotd-1",
    name: "Eagle Ridge Golf",
    logo_url: "https://example.com/eagleridge.png",
    website: "https://eagleridge.com",
    tier_id: "tier-shot-of-the-day",
    year: 2026,
    is_active: true,
    deleted_at: null,
    display_order: 5,
  },
  {
    id: "sp-sotd-2",
    name: "Local Grille",
    logo_url: null,
    website: "https://localgrille.com",
    tier_id: "tier-shot-of-the-day",
    year: 2026,
    is_active: true,
    deleted_at: null,
    display_order: 6,
  },
];

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

import * as serverModule from "@/lib/supabase/server";

function buildSupabaseMock() {
  // The page calls createClient → supabase.from("sponsorship_items").select(...)
  // and supabase.from("sponsors").select(...). Return stub data for each.
  const makeTierChain = () => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: STUB_TIERS, error: null }),
  });

  const makeSponsorChain = () => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: STUB_SPONSORS, error: null }),
  });

  let callCount = 0;
  const fromFn = vi.fn((_table: string) => {
    // First call is sponsorship_items, second is sponsors
    callCount++;
    return callCount === 1 ? makeTierChain() : makeSponsorChain();
  });

  vi.mocked(serverModule.createClient).mockResolvedValue({
    from: fromFn,
  } as unknown as Awaited<ReturnType<typeof serverModule.createClient>>);
}

// ---------------------------------------------------------------------------
// Import page (after mocks are in place)
// ---------------------------------------------------------------------------

// Dynamic import to avoid module caching issues with mock hoisting
async function renderPage() {
  const { default: SponsorsPage } = await import("../sponsors/page");
  const jsx = await SponsorsPage();
  const result = render(jsx as React.ReactElement);
  return result;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SponsorsPage — redesign (#220)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module registry to force fresh dynamic import
    vi.resetModules();
    buildSupabaseMock();
  });

  // -------------------------------------------------------------------------
  // Structural — testids present
  // -------------------------------------------------------------------------

  describe("structural testids", () => {
    it("renders data-testid=sponsors-header on the page header section", async () => {
      await renderPage();
      expect(screen.getByTestId("sponsors-header")).toBeInTheDocument();
    });

    it("renders data-testid=sponsors-cta on the CTA section", async () => {
      await renderPage();
      expect(screen.getByTestId("sponsors-cta")).toBeInTheDocument();
    });

    it("renders data-testid=tier-section-{id} for each tier", async () => {
      await renderPage();
      for (const tier of STUB_TIERS) {
        expect(screen.getByTestId(`tier-section-${tier.id}`)).toBeInTheDocument();
      }
    });

    it("renders data-testid=tier-heading-{id} for each tier", async () => {
      await renderPage();
      for (const tier of STUB_TIERS) {
        expect(screen.getByTestId(`tier-heading-${tier.id}`)).toBeInTheDocument();
      }
    });
  });

  // -------------------------------------------------------------------------
  // Header visual treatment
  // -------------------------------------------------------------------------

  describe("header visual treatment", () => {
    it("sponsors-header has bg-cream class", async () => {
      await renderPage();
      const header = screen.getByTestId("sponsors-header");
      expect(header.className).toContain("bg-cream");
    });

    it("sponsors-header has grain-overlay class", async () => {
      await renderPage();
      const header = screen.getByTestId("sponsors-header");
      expect(header.className).toContain("grain-overlay");
    });

    it("sponsors-header does NOT have bg-[#1A2E3A] (dark background removed)", async () => {
      await renderPage();
      const header = screen.getByTestId("sponsors-header");
      expect(header.className).not.toContain("bg-[#1A2E3A]");
    });
  });

  // -------------------------------------------------------------------------
  // CTA visual treatment
  // -------------------------------------------------------------------------

  describe("CTA visual treatment", () => {
    it("sponsors-cta has bg-[#1A2E3A] class", async () => {
      await renderPage();
      const cta = screen.getByTestId("sponsors-cta");
      expect(cta.className).toContain("bg-[#1A2E3A]");
    });

    it("sponsors-cta has grain-overlay class", async () => {
      await renderPage();
      const cta = screen.getByTestId("sponsors-cta");
      expect(cta.className).toContain("grain-overlay");
    });

    it("sponsors-cta does NOT use bg-neutral-50 (old design)", async () => {
      await renderPage();
      const cta = screen.getByTestId("sponsors-cta");
      expect(cta.className).not.toContain("bg-neutral-50");
    });

    it("sponsors-cta renders data-testid=sponsors-cta-button", async () => {
      await renderPage();
      expect(screen.getByTestId("sponsors-cta-button")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Tier-to-tierSize routing
  // -------------------------------------------------------------------------

  describe("tier-to-tierSize routing", () => {
    it("Champion section (sort_order=1) renders SponsorCards with champion testids", async () => {
      await renderPage();
      const champSection = screen.getByTestId("tier-section-tier-champion");
      // Unified testid scheme (#227): sponsor-card-{id} for both logo and patron variants.
      // Fall back to old split testids for green/backward compat until Bolt ships the rewrite.
      const champCard =
        within(champSection).queryByTestId("sponsor-card-sp-champ-1") ??
        within(champSection).queryByTestId("sponsor-card-logo-sp-champ-1") ??
        within(champSection).queryByTestId("sponsor-card-text-sp-champ-1");
      expect(champCard).toBeInTheDocument();
    });

    it("Champion section cards have champion tier visual treatment (tier-strip)", async () => {
      await renderPage();
      const champSection = screen.getByTestId("tier-section-tier-champion");
      // Tournament Program direction: champion cards have a tier-strip, not border-l-4.
      // This assertion is RED until Bolt ships the tier-strip implementation.
      const hasTierStrip = within(champSection).queryByTestId("tier-strip");
      expect(hasTierStrip).toBeInTheDocument();
    });

    it("Shot of the Day section (sort_order=4) renders compact SponsorCards", async () => {
      await renderPage();
      const sotdSection = screen.getByTestId("tier-section-tier-shot-of-the-day");
      // Compact cards should have max-h-12 or h-12 (48px logo height) somewhere in section
      const hasMaxH12 = Array.from(sotdSection.querySelectorAll("*")).some(
        (el) => el.className && (el.className.includes("max-h-12") || el.className.includes("h-12"))
      );
      const hasInlineH48 = Array.from(sotdSection.querySelectorAll("*")).some(
        (el) => (el as HTMLElement).style?.height === "48px"
      );
      expect(hasMaxH12 || hasInlineH48).toBe(true);
    });

    it("Shot of the Day section does NOT have a tier-strip (compact tier, no strip)", async () => {
      await renderPage();
      const sotdSection = screen.getByTestId("tier-section-tier-shot-of-the-day");
      // Tournament Program: only champion/eagle get a tier-strip.
      const tierStrip = within(sotdSection).queryByTestId("tier-strip");
      expect(tierStrip).not.toBeInTheDocument();
    });

    it("Eagle section (sort_order=2) renders SponsorCards for eagle-tier sponsors", async () => {
      await renderPage();
      const eagleSection = screen.getByTestId("tier-section-tier-eagle");
      const eagleCard =
        within(eagleSection).queryByTestId("sponsor-card-sp-eagle-1") ??
        within(eagleSection).queryByTestId("sponsor-card-logo-sp-eagle-1") ??
        within(eagleSection).queryByTestId("sponsor-card-text-sp-eagle-1");
      expect(eagleCard).toBeInTheDocument();
    });

    it("Morning Biscuit section (sort_order=3) renders SponsorCards for its sponsors", async () => {
      await renderPage();
      const mbSection = screen.getByTestId("tier-section-tier-morning-biscuit");
      const mbCard =
        within(mbSection).queryByTestId("sponsor-card-sp-mb-1") ??
        within(mbSection).queryByTestId("sponsor-card-logo-sp-mb-1") ??
        within(mbSection).queryByTestId("sponsor-card-text-sp-mb-1");
      expect(mbCard).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // No grayscale on any sponsor logos — global invariant
  // -------------------------------------------------------------------------

  describe("no grayscale filter on the page", () => {
    it("rendered HTML does not contain the string 'grayscale' anywhere", async () => {
      const { container } = await renderPage();
      expect(container.innerHTML).not.toContain("grayscale");
    });
  });

  // -------------------------------------------------------------------------
  // Sponsor cards placed in correct tier sections — no cross-tier bleed
  // -------------------------------------------------------------------------

  describe("sponsor cards are in their correct tier sections", () => {
    it("Champion sponsor sp-champ-1 is inside the champion tier section", async () => {
      await renderPage();
      const champSection = screen.getByTestId("tier-section-tier-champion");
      // Unified testid (#227) takes priority; fall back to old split testids for compat.
      const card =
        within(champSection).queryByTestId("sponsor-card-sp-champ-1") ??
        within(champSection).queryByTestId("sponsor-card-logo-sp-champ-1") ??
        within(champSection).queryByTestId("sponsor-card-text-sp-champ-1");
      expect(card).toBeInTheDocument();
    });

    it("Champion sponsor sp-champ-1 is NOT inside the eagle tier section", async () => {
      await renderPage();
      const eagleSection = screen.getByTestId("tier-section-tier-eagle");
      const card =
        within(eagleSection).queryByTestId("sponsor-card-sp-champ-1") ??
        within(eagleSection).queryByTestId("sponsor-card-logo-sp-champ-1") ??
        within(eagleSection).queryByTestId("sponsor-card-text-sp-champ-1");
      expect(card).not.toBeInTheDocument();
    });

    it("Shot of the Day sponsor sp-sotd-1 is inside the SOTD tier section", async () => {
      await renderPage();
      const sotdSection = screen.getByTestId("tier-section-tier-shot-of-the-day");
      const card =
        within(sotdSection).queryByTestId("sponsor-card-sp-sotd-1") ??
        within(sotdSection).queryByTestId("sponsor-card-logo-sp-sotd-1") ??
        within(sotdSection).queryByTestId("sponsor-card-text-sp-sotd-1");
      expect(card).toBeInTheDocument();
    });
  });
});
