/**
 * sponsors-page.test.tsx — Sprint 22 RED phase
 *
 * Integration tests for the rewritten /sponsors page.
 * The current page (src/app/(public)/sponsors/page.tsx) does NOT yet implement:
 *   - partner-grid--champion / eagle / standard / compact CSS classes
 *   - masthead stats (lifetime_raised_cents)
 *   - OpenSponsorshipsBlock with tier chips for empty tiers
 *   - Bottom CTA href="/donate" (currently /sponsorships)
 *   - Tier sections only rendered for active sponsors (currently renders all tiers)
 *   - Soft-delete filtering on both tier sections and open-sponsorships chips
 *
 * All tests marked with "(RED)" will fail until Bolt's PR B (GREEN) implements
 * the redesigned page.
 *
 * RED phase per craven sprint pattern (#247, #248, #249).
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before any module import
// ---------------------------------------------------------------------------

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    [key: string]: unknown;
  }) => <img src={src} alt={alt} {...props} />,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock the public SponsorCard so the page can render without CSS/image issues
vi.mock("@/components/public/sponsor-card", () => ({
  SponsorCard: ({
    sponsor,
    tierSize,
  }: {
    sponsor: { id: string; name: string; logo_url: string | null; website: string | null };
    tierSize: string;
  }) => (
    <div data-testid={`sponsor-card-${sponsor.id}`} data-tier-size={tierSize}>
      {sponsor.name}
    </div>
  ),
  // Export TierSize so page imports don't break
}));

// Mock OpenSponsorshipsBlock — it doesn't exist yet, so we provide a stub
// that will let the page render once Bolt wires it up. Until then the page
// itself won't import it, so this mock is a forward declaration.
vi.mock("@/components/public/open-sponsorships-block", () => ({
  OpenSponsorshipsBlock: ({
    items,
  }: {
    items: Array<{ id: string; name: string; price_cents: number }>;
  }) => {
    if (!items.length) return null;
    return (
      <div data-testid="open-sponsorships-block">
        {items.map((item) => (
          <a key={item.id} href="/sponsorships" data-testid={`chip-${item.id}`}>
            {item.name}
          </a>
        ))}
        <a href="/sponsorships">Browse all sponsorships →</a>
      </div>
    );
  },
}));

vi.mock("@/components/public/section-eyebrow", () => ({
  SectionEyebrow: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("@/components/ui/link-button", () => ({
  LinkButton: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import * as serverModule from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Data factories
// ---------------------------------------------------------------------------

type MockTier = {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
  deleted_at: string | null;
};

type MockSponsor = {
  id: string;
  name: string;
  tier_id: string;
  logo_url: string | null;
  website: string | null;
  is_active: boolean;
  deleted_at: string | null;
  display_order: number;
  year: number;
};

function makeTier(overrides: Partial<MockTier> = {}): MockTier {
  return {
    id: "tier-default",
    name: "Default Tier",
    sort_order: 3,
    active: true,
    deleted_at: null,
    ...overrides,
  };
}

function makeSponsor(overrides: Partial<MockSponsor> = {}): MockSponsor {
  return {
    id: "sponsor-default",
    name: "Default Corp",
    tier_id: "tier-champion",
    logo_url: null,
    website: null,
    is_active: true,
    deleted_at: null,
    display_order: 1,
    year: 2026,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Supabase mock helpers
// ---------------------------------------------------------------------------

type MockEventSettings = { lifetime_raised_cents: number | null } | null;

function buildSupabaseMock(opts: {
  tiers: MockTier[];
  sponsors: MockSponsor[];
  eventSettings?: MockEventSettings;
}) {
  const { tiers, sponsors, eventSettings = null } = opts;

  // Track which table is being queried for chained mocks
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === "sponsorship_items") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: tiers, error: null }),
          }),
        }),
      };
    }

    if (table === "sponsors") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                order: vi
                  .fn()
                  .mockResolvedValue({ data: sponsors, error: null }),
              }),
            }),
          }),
        }),
      };
    }

    if (table === "event_settings") {
      return {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: eventSettings,
            error: null,
          }),
        }),
      };
    }

    return {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    };
  });

  return { from: fromMock };
}

function setClient(client: unknown) {
  vi.mocked(serverModule.createClient).mockResolvedValue(
    client as Awaited<ReturnType<typeof serverModule.createClient>>
  );
}

// ---------------------------------------------------------------------------
// Page loader (reset modules between tests to clear component cache)
// ---------------------------------------------------------------------------

async function loadPage() {
  const mod = await import("@/app/(public)/sponsors/page");
  return mod.default;
}

// ---------------------------------------------------------------------------
// Seed data for integration tests
// ---------------------------------------------------------------------------

// 4 tiers with sponsors + 6 empty active tiers + 1 soft-deleted tier
const TIERS_WITH_SPONSORS: MockTier[] = [
  makeTier({ id: "tier-champion", name: "Champion", sort_order: 1 }),
  makeTier({ id: "tier-eagle", name: "Eagle", sort_order: 2 }),
  makeTier({ id: "tier-gold", name: "Gold", sort_order: 3 }),
  makeTier({ id: "tier-silver", name: "Silver", sort_order: 4 }),
];

const EMPTY_TIERS: MockTier[] = [
  makeTier({ id: "tier-hole", name: "Hole Sponsor", sort_order: 5, active: true }),
  makeTier({ id: "tier-cart", name: "Cart Sponsor", sort_order: 6, active: true }),
  makeTier({ id: "tier-putting", name: "Putting Green", sort_order: 7, active: true }),
  makeTier({ id: "tier-driving", name: "Driving Range", sort_order: 8, active: true }),
  makeTier({ id: "tier-lunch", name: "Lunch Sponsor", sort_order: 9, active: true }),
  makeTier({ id: "tier-beverage", name: "Beverage Sponsor", sort_order: 10, active: true }),
];

const DELETED_TIER: MockTier = makeTier({
  id: "tier-deleted",
  name: "Deleted Tier",
  sort_order: 11,
  active: false,
  deleted_at: "2026-03-01T00:00:00.000Z",
});

const ALL_TIERS = [...TIERS_WITH_SPONSORS, ...EMPTY_TIERS, DELETED_TIER];

const ACTIVE_SPONSORS: MockSponsor[] = [
  makeSponsor({ id: "s-champ-1", name: "Champion Corp 1", tier_id: "tier-champion" }),
  makeSponsor({ id: "s-champ-2", name: "Champion Corp 2", tier_id: "tier-champion" }),
  makeSponsor({ id: "s-eagle-1", name: "Eagle Corp 1", tier_id: "tier-eagle" }),
  makeSponsor({ id: "s-gold-1", name: "Gold Corp 1", tier_id: "tier-gold" }),
  makeSponsor({ id: "s-silver-1", name: "Silver Corp 1", tier_id: "tier-silver" }),
];

// ---------------------------------------------------------------------------
// Tests 26–36
// ---------------------------------------------------------------------------

describe("SponsorsPage — redesign (Sprint 22 RED, #250)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  // ── Test 26: Only 4 tier sections render (populated tiers only) ────────────

  it("(RED) 26 — exactly 4 tier sections render when 4 tiers have active sponsors", async () => {
    setClient(
      buildSupabaseMock({
        tiers: ALL_TIERS,
        sponsors: ACTIVE_SPONSORS,
      })
    );

    const Page = await loadPage();
    render(await Page());

    // The redesigned page should only render a tier section for tiers with sponsors
    const tierSections = screen
      .getAllByTestId(/^tier-section-/)
      .filter((el) => el.getAttribute("data-testid") !== "tier-section-deleted");

    expect(tierSections).toHaveLength(4);
  });

  // ── Test 27: Empty tiers do NOT render as tier sections ───────────────────

  it("(RED) 27 — tier sections with 0 active sponsors are not rendered", async () => {
    setClient(
      buildSupabaseMock({
        tiers: ALL_TIERS,
        sponsors: ACTIVE_SPONSORS,
      })
    );

    const Page = await loadPage();
    render(await Page());

    // None of the empty tier IDs should appear as tier-section testids
    for (const emptyTier of EMPTY_TIERS) {
      expect(
        screen.queryByTestId(`tier-section-${emptyTier.id}`)
      ).not.toBeInTheDocument();
    }
  });

  // ── Test 28: OpenSponsorshipsBlock renders with 6 chips for 6 empty tiers ─

  it("(RED) 28 — open-sponsorships-block renders when there are empty active tiers", async () => {
    setClient(
      buildSupabaseMock({
        tiers: ALL_TIERS,
        sponsors: ACTIVE_SPONSORS,
      })
    );

    const Page = await loadPage();
    render(await Page());

    expect(screen.getByTestId("open-sponsorships-block")).toBeInTheDocument();

    // Verify one chip per empty active tier (6 empty tiers)
    const chips = EMPTY_TIERS.map((t) =>
      screen.queryByTestId(`chip-${t.id}`)
    ).filter(Boolean);
    expect(chips).toHaveLength(EMPTY_TIERS.length);
  });

  // ── Test 29: Soft-deleted tiers do not appear as sections or chips ─────────

  it("(RED) 29 — soft-deleted tiers do not appear as tier sections or open-sponsorship chips", async () => {
    setClient(
      buildSupabaseMock({
        tiers: ALL_TIERS,
        sponsors: ACTIVE_SPONSORS,
      })
    );

    const Page = await loadPage();
    render(await Page());

    // The deleted tier should not appear anywhere
    expect(
      screen.queryByTestId(`tier-section-${DELETED_TIER.id}`)
    ).not.toBeInTheDocument();
    expect(screen.queryByText(DELETED_TIER.name)).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(`chip-${DELETED_TIER.id}`)
    ).not.toBeInTheDocument();
  });

  // ── Test 30: Masthead stat 3 ("Raised to Date") renders when non-null ──────

  it("(RED) 30 — masthead stat 'Raised to Date' renders when lifetime_raised_cents is non-null", async () => {
    setClient(
      buildSupabaseMock({
        tiers: TIERS_WITH_SPONSORS,
        sponsors: ACTIVE_SPONSORS,
        eventSettings: { lifetime_raised_cents: 58000000 }, // $580K
      })
    );

    const Page = await loadPage();
    render(await Page());

    // The formatted value "$580K+" should appear in the masthead stats
    expect(screen.getByText(/\$580K\+/)).toBeInTheDocument();
  });

  // ── Test 31: Masthead stat 3 absent when lifetime_raised_cents is null ──────

  it("(RED) 31 — masthead stat 'Raised to Date' is absent when lifetime_raised_cents is null", async () => {
    setClient(
      buildSupabaseMock({
        tiers: TIERS_WITH_SPONSORS,
        sponsors: ACTIVE_SPONSORS,
        eventSettings: { lifetime_raised_cents: null },
      })
    );

    const Page = await loadPage();
    render(await Page());

    expect(screen.queryByText(/raised to date/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$.*K\+/)).not.toBeInTheDocument();
  });

  // ── Test 32: Bottom CTA href="/donate" ────────────────────────────────────

  it("(RED) 32 — bottom CTA button has href='/donate'", async () => {
    setClient(
      buildSupabaseMock({
        tiers: TIERS_WITH_SPONSORS,
        sponsors: ACTIVE_SPONSORS,
      })
    );

    const Page = await loadPage();
    render(await Page());

    // The redesigned bottom CTA should link to /donate, not /sponsorships
    const ctaButton = screen.getByTestId("sponsors-cta-button");
    expect(ctaButton).toHaveAttribute("href", "/donate");
  });

  // ── Test 33: Champion tier renders with partner-grid--champion class ────────

  it("(RED) 33 — champion tier grid has class 'partner-grid--champion'", async () => {
    setClient(
      buildSupabaseMock({
        tiers: [makeTier({ id: "tier-champion", name: "Champion", sort_order: 1 })],
        sponsors: [makeSponsor({ id: "s1", name: "Champ Co", tier_id: "tier-champion" })],
      })
    );

    const Page = await loadPage();
    const { container } = render(await Page());

    expect(
      container.querySelector(".partner-grid--champion")
    ).toBeInTheDocument();
  });

  // ── Test 34: Eagle tier renders with partner-grid--eagle class ─────────────

  it("(RED) 34 — eagle tier grid has class 'partner-grid--eagle'", async () => {
    setClient(
      buildSupabaseMock({
        tiers: [makeTier({ id: "tier-eagle", name: "Eagle", sort_order: 2 })],
        sponsors: [makeSponsor({ id: "s2", name: "Eagle Co", tier_id: "tier-eagle" })],
      })
    );

    const Page = await loadPage();
    const { container } = render(await Page());

    expect(
      container.querySelector(".partner-grid--eagle")
    ).toBeInTheDocument();
  });

  // ── Test 35: Standard tier renders with partner-grid--standard class ────────

  it("(RED) 35 — standard tier grid has class 'partner-grid--standard'", async () => {
    setClient(
      buildSupabaseMock({
        tiers: [makeTier({ id: "tier-gold", name: "Gold", sort_order: 3 })],
        sponsors: [makeSponsor({ id: "s3", name: "Gold Co", tier_id: "tier-gold" })],
      })
    );

    const Page = await loadPage();
    const { container } = render(await Page());

    expect(
      container.querySelector(".partner-grid--standard")
    ).toBeInTheDocument();
  });

  // ── Test 36: Tier with 7 sponsors renders with partner-grid--compact class ──

  it("(RED) 36 — tier with 7 sponsors renders with class 'partner-grid--compact'", async () => {
    const compactTier = makeTier({ id: "tier-compact", name: "Compact Tier", sort_order: 1 });
    const compactSponsors = Array.from({ length: 7 }, (_, i) =>
      makeSponsor({
        id: `s-compact-${i + 1}`,
        name: `Compact Sponsor ${i + 1}`,
        tier_id: "tier-compact",
      })
    );

    setClient(
      buildSupabaseMock({
        tiers: [compactTier],
        sponsors: compactSponsors,
      })
    );

    const Page = await loadPage();
    const { container } = render(await Page());

    expect(
      container.querySelector(".partner-grid--compact")
    ).toBeInTheDocument();
  });

  // ── Inline AC #14: count badge format "{N} · {year} Season" ──────────────

  it("AC #14 — champion tier shows count badge in '{N} · {year} Season' format", async () => {
    const championTier = makeTier({ id: "tier-champion", name: "Champion", sort_order: 1 });
    const champSponsors = Array.from({ length: 4 }, (_, i) =>
      makeSponsor({
        id: `s-ac14-${i + 1}`,
        name: `Champion Sponsor ${i + 1}`,
        tier_id: "tier-champion",
      })
    );

    setClient(
      buildSupabaseMock({
        tiers: [championTier],
        sponsors: champSponsors,
      })
    );

    const Page = await loadPage();
    render(await Page());

    // Count badge must read "{count} · {year} Season"
    const currentYear = new Date().getFullYear();
    expect(
      screen.getByText(new RegExp(`4 · ${currentYear} Season`))
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Sprint 25: Open Sponsorships section header tests
// ---------------------------------------------------------------------------

describe("SponsorsPage — Open Sponsorships section header (Sprint 25)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  // ── Test S25-1: Header H2 renders when openItems.length > 0 ────────────────

  it("S25-1 — 'Open Sponsorships' H2 renders when there are open items", async () => {
    setClient(
      buildSupabaseMock({
        tiers: ALL_TIERS,
        sponsors: ACTIVE_SPONSORS,
      })
    );

    const Page = await loadPage();
    render(await Page());

    expect(
      screen.getByTestId("open-sponsorships-heading")
    ).toBeInTheDocument();
    expect(screen.getByTestId("open-sponsorships-heading")).toHaveTextContent(
      "Open Sponsorships"
    );
  });

  // ── Test S25-2: Count text "{N} Categories · {year} Season" ────────────────

  it("S25-2 — count badge reads '{N} Categories · {year} Season' with correct count", async () => {
    // 6 empty tiers in ALL_TIERS
    setClient(
      buildSupabaseMock({
        tiers: ALL_TIERS,
        sponsors: ACTIVE_SPONSORS,
      })
    );

    const Page = await loadPage();
    render(await Page());

    const currentYear = new Date().getFullYear();
    // EMPTY_TIERS has 6 items
    expect(
      screen.getByText(new RegExp(`6 Categories · ${currentYear} Season`))
    ).toBeInTheDocument();
  });

  // ── Test S25-3: Header ABSENT when openItems is empty ──────────────────────

  it("S25-3 — 'Open Sponsorships' header is absent when all tiers have sponsors", async () => {
    // Give every tier in TIERS_WITH_SPONSORS an active sponsor — no open items
    setClient(
      buildSupabaseMock({
        tiers: TIERS_WITH_SPONSORS,
        sponsors: ACTIVE_SPONSORS,
      })
    );

    const Page = await loadPage();
    render(await Page());

    expect(
      screen.queryByTestId("open-sponsorships-heading")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("open-sponsorships-section")
    ).not.toBeInTheDocument();
  });

  // ── Test S25-4: Header H2 is a sibling of OpenSponsorshipsBlock, not inside it ──

  it("S25-4 — Open Sponsorships H2 is outside the OpenSponsorshipsBlock component", async () => {
    setClient(
      buildSupabaseMock({
        tiers: ALL_TIERS,
        sponsors: ACTIVE_SPONSORS,
      })
    );

    const Page = await loadPage();
    render(await Page());

    const heading = screen.getByTestId("open-sponsorships-heading");
    const block = screen.getByTestId("open-sponsorships-block");

    // The heading must not be a descendant of the block
    expect(block.contains(heading)).toBe(false);
    // Both must be in the document
    expect(heading).toBeInTheDocument();
    expect(block).toBeInTheDocument();
  });
});
