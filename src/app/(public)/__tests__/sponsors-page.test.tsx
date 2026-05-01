/**
 * Integration tests for the public SponsorsPage — #220 Public Sponsors Redesign
 *
 * Updated for Sprint 22 Marquee redesign (#250):
 *   - Masthead replaces the old cream header (sponsors-masthead testid, not sponsors-header)
 *   - CTA background set via inline style (--brand-darker CSS var), not bg-[#1A2E3A] class
 *   - grain-overlay dropped from CTA in new design
 *   - Tier strips dropped from SponsorCard (Marquee direction)
 *   - Mock updated for 3 queries: event_settings, sponsorship_items, sponsors
 *
 * Sprint 33 additions (#302):
 *   - sponsorship_items query must filter to category='sponsorship' only
 *   - Tribute items (Balloons) and supporter items (Tee Sign) must not appear
 *
 * Design spec: plans/sprint-22-sponsors-redesign.md
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
  { id: "tier-champion", name: "Champion Sponsor", sort_order: 1, active: true, deleted_at: null, price_cents: 500000 },
  { id: "tier-eagle", name: "Eagle Sponsor", sort_order: 2, active: true, deleted_at: null, price_cents: 250000 },
  { id: "tier-morning-biscuit", name: "Morning Biscuit", sort_order: 3, active: true, deleted_at: null, price_cents: 100000 },
  { id: "tier-shot-of-the-day", name: "Shot of the Day", sort_order: 4, active: true, deleted_at: null, price_cents: 50000 },
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

// Sprint 33: track whether sponsorship_items query included category filter
let _categoryFilterApplied = false;

function buildSupabaseMock(opts: { tiersToReturn?: typeof STUB_TIERS } = {}) {
  const { tiersToReturn = STUB_TIERS } = opts;
  _categoryFilterApplied = false;

  // Sprint 22: page now makes 3 queries:
  //   1. event_settings → .select(...).single()
  //   2. sponsorship_items → .select(...).eq('active', true).eq('category','sponsorship').order(...)
  //      Sprint 33: added .eq('category', 'sponsorship') to this chain
  //   3. sponsors → .select(...).eq(...).eq(...).is(...).order(...)
  const makeEventSettingsChain = () => ({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { lifetime_raised_cents: null }, error: null }),
    }),
  });

  const makeTierChain = () => {
    const eqCategoryFn = vi.fn().mockImplementation((field: string, value: string) => {
      if (field === "category" && value === "sponsorship") {
        _categoryFilterApplied = true;
      }
      // Simulate DB-side category filter: return only items matching the category value,
      // treating items without a category field as 'sponsorship' (the default).
      const filtered = field === "category"
        ? tiersToReturn.filter(
            (t) => (t as { category?: string }).category === value ||
              (t as { category?: string }).category === undefined
          )
        : tiersToReturn;
      const orderFnFiltered = vi.fn().mockResolvedValue({ data: filtered, error: null });
      return { order: orderFnFiltered };
    });
    const orderFn = vi.fn().mockResolvedValue({ data: tiersToReturn, error: null });
    const eqActiveFn = vi.fn().mockReturnValue({
      order: orderFn,
      eq: eqCategoryFn,
    });
    return {
      select: vi.fn().mockReturnValue({ eq: eqActiveFn }),
    };
  };

  const makeSponsorChain = () => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: STUB_SPONSORS, error: null }),
          }),
        }),
      }),
    }),
  });

  const fromFn = vi.fn((table: string) => {
    if (table === "event_settings") return makeEventSettingsChain();
    if (table === "sponsorship_items") return makeTierChain();
    if (table === "sponsors") return makeSponsorChain();
    return {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    };
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
// Tests — updated for Sprint 22 Marquee design
// ---------------------------------------------------------------------------

describe("SponsorsPage — redesign (#220, updated Sprint 22)", () => {
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
    // Sprint 22: masthead replaces the old cream header
    it("renders data-testid=sponsors-masthead on the masthead section", async () => {
      await renderPage();
      expect(screen.getByTestId("sponsors-masthead")).toBeInTheDocument();
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
  // CTA visual treatment (Sprint 22 Marquee)
  // -------------------------------------------------------------------------

  describe("CTA visual treatment", () => {
    // Sprint 22: background is set via inline style (--brand-darker CSS var), not class
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
      // Unified testid scheme: sponsor-card-{id}
      const champCard = within(champSection).queryByTestId("sponsor-card-sp-champ-1");
      expect(champCard).toBeInTheDocument();
    });

    // Sprint 22 Marquee: tier strips are dropped — champion cards use white bg + accent line
    it("Champion section does NOT have a tier-strip (Marquee design dropped tier strips)", async () => {
      await renderPage();
      const champSection = screen.getByTestId("tier-section-tier-champion");
      const strips = within(champSection).queryAllByTestId("tier-strip");
      expect(strips.length).toBe(0);
    });

    it("Shot of the Day section (sort_order=4) renders compact SponsorCards", async () => {
      await renderPage();
      const sotdSection = screen.getByTestId("tier-section-tier-shot-of-the-day");
      // Sprint 22: compact grid uses partner-grid--compact or partner-grid--standard class
      // (SOTD has 2 sponsors, sort_order=4 → standard; not compact since count <= 6)
      // Just verify tier section exists and contains sponsor cards
      const cards = within(sotdSection).queryAllByTestId(/^sponsor-card-sp-sotd/);
      expect(cards.length).toBeGreaterThan(0);
    });

    it("Shot of the Day section does NOT have a tier-strip (Marquee design)", async () => {
      await renderPage();
      const sotdSection = screen.getByTestId("tier-section-tier-shot-of-the-day");
      const tierStrip = within(sotdSection).queryByTestId("tier-strip");
      expect(tierStrip).not.toBeInTheDocument();
    });

    it("Eagle section (sort_order=2) renders SponsorCards for eagle-tier sponsors", async () => {
      await renderPage();
      const eagleSection = screen.getByTestId("tier-section-tier-eagle");
      const eagleCard = within(eagleSection).queryByTestId("sponsor-card-sp-eagle-1");
      expect(eagleCard).toBeInTheDocument();
    });

    it("Morning Biscuit section (sort_order=3) renders SponsorCards for its sponsors", async () => {
      await renderPage();
      const mbSection = screen.getByTestId("tier-section-tier-morning-biscuit");
      const mbCard = within(mbSection).queryByTestId("sponsor-card-sp-mb-1");
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
      const card = within(champSection).queryByTestId("sponsor-card-sp-champ-1");
      expect(card).toBeInTheDocument();
    });

    it("Champion sponsor sp-champ-1 is NOT inside the eagle tier section", async () => {
      await renderPage();
      const eagleSection = screen.getByTestId("tier-section-tier-eagle");
      const card = within(eagleSection).queryByTestId("sponsor-card-sp-champ-1");
      expect(card).not.toBeInTheDocument();
    });

    it("Shot of the Day sponsor sp-sotd-1 is inside the SOTD tier section", async () => {
      await renderPage();
      const sotdSection = screen.getByTestId("tier-section-tier-shot-of-the-day");
      const card = within(sotdSection).queryByTestId("sponsor-card-sp-sotd-1");
      expect(card).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Sprint 33 RED — /sponsors page filters sponsorship_items to category='sponsorship'
// ---------------------------------------------------------------------------

describe("SponsorsPage — category=sponsorship filter (Sprint 33 RED, #302)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    buildSupabaseMock();
  });

  it("(RED) S33-A — sponsorship_items query applies .eq('category', 'sponsorship') filter", async () => {
    await renderPage();
    // The mock tracks whether .eq('category', 'sponsorship') was called on the tier chain
    expect(_categoryFilterApplied).toBe(true);
  });

  it("(RED) S33-B — 'Balloons' tribute item does not appear on /sponsors page", async () => {
    const balloonsItem = {
      id: "tier-balloons",
      name: "Balloons",
      sort_order: 99,
      active: true,
      deleted_at: null,
      price_cents: 2000,
      category: "tribute" as const,
    };

    // Include Balloons in the pool but mock so the category filter should exclude it
    // Since the current page doesn't filter by category, this test catches the RED state.
    buildSupabaseMock({
      tiersToReturn: [
        ...STUB_TIERS,
        balloonsItem,
      ],
    });

    await renderPage();

    // With the category filter in place, Balloons should not be returned by the query
    // and should not appear on the page.
    // RED: currently fails because the page doesn't filter by category.
    expect(screen.queryByTestId("tier-section-tier-balloons")).not.toBeInTheDocument();
    expect(screen.queryByText("Balloons")).not.toBeInTheDocument();
  });

  it("(RED) S33-C — 'Tee Sign' supporter item does not appear on /sponsors page", async () => {
    const teeSignItem = {
      id: "tier-tee-sign",
      name: "Tee Sign",
      sort_order: 100,
      active: true,
      deleted_at: null,
      price_cents: 10000,
      category: "supporter" as const,
    };

    buildSupabaseMock({
      tiersToReturn: [
        ...STUB_TIERS,
        teeSignItem,
      ],
    });

    await renderPage();

    expect(screen.queryByTestId("tier-section-tier-tee-sign")).not.toBeInTheDocument();
    expect(screen.queryByText("Tee Sign")).not.toBeInTheDocument();
  });
});
