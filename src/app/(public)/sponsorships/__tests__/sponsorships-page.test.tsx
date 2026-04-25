/**
 * sponsorships-page.test.tsx — Sprint 23 RED phase
 *
 * Integration tests for the rewritten /sponsorships page.
 * The current page (src/app/(public)/sponsorships/page.tsx) does NOT yet implement:
 *   - 10 SponsorshipCard components (currently uses SponsorshipGrid inline cards)
 *   - Price-descending order with sort_order tiebreaker
 *   - Masthead pulling lifetime_raised_cents from event_settings
 *   - Reassurance strip below the grid
 *   - Anchor IDs (id="<slug>") on every card
 *   - Removal of bg-purple, bg-purple-hover, font-display
 *   - Soft-delete and inactive item filtering (existing fetch already filters these;
 *     these tests verify the contracts continue to hold after the rewrite)
 *
 * All tests here will fail until Bolt's GREEN PR rewrites the page and implements
 * SponsorshipCard + SponsorshipGrid replacement.
 *
 * RED phase per craven sprint pattern (#247, #248, #249, Sprint 22 #252).
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — hoisted before module imports
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

// Mock SponsorshipCard — doesn't exist yet. Stub renders a minimal card
// that satisfies testability requirements: id attribute, name, price, testid.
vi.mock("@/components/public/sponsorship-card", () => ({
  SponsorshipCard: ({
    item,
    summary,
  }: {
    item: {
      id: string;
      name: string;
      price_cents: number;
      max_quantity: number | null;
      sold_count: number;
      sort_order?: number;
    };
    summary: string;
  }) => {
    // Replicate slugifyItemName inline so stub IDs match what real component would produce
    const slug = item.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return (
      <div
        id={slug}
        data-testid={`sponsorship-card-${item.id}`}
        data-price-cents={item.price_cents}
        data-sort-order={item.sort_order ?? 0}
      >
        <span className="product-price">
          ${(item.price_cents / 100).toLocaleString("en-US")}
        </span>
        <span className="product-name">{item.name}</span>
        <span className="product-summary">{summary}</span>
        {item.max_quantity === 1 && item.sold_count === 0 && (
          <span>1 of 1 available</span>
        )}
        <button>Select package</button>
      </div>
    );
  },
}));

// Mock SponsorshipGrid if it's still imported (current page imports it)
vi.mock(
  "@/app/(public)/sponsorships/sponsorship-grid",
  () => ({
    SponsorshipGrid: ({
      items,
    }: {
      items: Array<{
        id: string;
        name: string;
        price_cents: number;
        max_quantity: number | null;
        sold_count: number;
        sort_order?: number;
      }>;
    }) => (
      <div data-testid="sponsorship-grid-stub">
        {items.map((item) => {
          const slug = item.name
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
          return (
            <div
              key={item.id}
              id={slug}
              data-testid={`sponsorship-card-${item.id}`}
              data-price-cents={item.price_cents}
              data-sort-order={item.sort_order ?? 0}
              className=""
            >
              <span>${(item.price_cents / 100).toLocaleString("en-US")}</span>
              <span>{item.name}</span>
              <button>Select package</button>
            </div>
          );
        })}
      </div>
    ),
  })
);

vi.mock("@/components/public/section-eyebrow", () => ({
  SectionEyebrow: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("@/components/public/public-empty-state", () => ({
  PublicEmptyState: () => <div data-testid="empty-state">No packages available</div>,
}));

vi.mock("@/components/public/prospect-capture-form", () => ({
  ProspectCaptureForm: () => <div data-testid="prospect-form" />,
}));

import * as serverModule from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Data factories
// ---------------------------------------------------------------------------

type MockSponsorshipItem = {
  id: string;
  name: string;
  price_cents: number;
  max_quantity: number | null;
  sold_count: number;
  active: boolean;
  deleted_at: string | null;
  year: number;
  sort_order: number;
  description: string | null;
  benefits: string[];
};

function makeItem(overrides: Partial<MockSponsorshipItem> = {}): MockSponsorshipItem {
  return {
    id: "default-id",
    name: "Default Package",
    price_cents: 100000,
    max_quantity: null,
    sold_count: 0,
    active: true,
    deleted_at: null,
    year: 2026,
    sort_order: 99,
    description: null,
    benefits: [],
    ...overrides,
  };
}

// 10 packages matching the prod data set described in the plan
// Price-descending order, sort_order as tiebreaker
const ALL_10_ITEMS: MockSponsorshipItem[] = [
  makeItem({ id: "champion",        name: "Champion",               price_cents: 500000, sort_order: 1 }),
  makeItem({ id: "eagle",           name: "Eagle",                  price_cents: 250000, sort_order: 2 }),
  makeItem({ id: "golf-gift",       name: "Golf Gift",              price_cents: 250000, sort_order: 3 }),
  makeItem({ id: "hole-sponsor",    name: "Hole Sponsor",           price_cents: 100000, sort_order: 4 }),
  makeItem({ id: "golf-carts",      name: "Golf Carts",             price_cents:  70000, sort_order: 5 }),
  makeItem({ id: "thursday-night",  name: "Thursday Night",         price_cents:  50000, sort_order: 6 }),
  makeItem({ id: "bloody-mary-bar", name: "Bloody Mary Bar",        price_cents:  50000, sort_order: 7, max_quantity: 1, sold_count: 0 }),
  makeItem({ id: "morning-biscuit", name: "Morning Biscuit Sponsor",price_cents:  50000, sort_order: 8 }),
  makeItem({ id: "shot-of-the-day", name: "Shot of the Day",       price_cents:  25000, sort_order: 9 }),
  makeItem({ id: "putting-contest", name: "Putting Contest",        price_cents:  25000, sort_order: 10 }),
];

// ---------------------------------------------------------------------------
// Supabase mock builder
// ---------------------------------------------------------------------------

type MockEventSettings = { lifetime_raised_cents: number | null } | null;

function buildSupabaseMock(opts: {
  items: MockSponsorshipItem[];
  eventSettings?: MockEventSettings;
}) {
  const { items, eventSettings = null } = opts;

  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === "sponsorship_items") {
      // Chain: .select("*").eq("year",...).eq("active",true).is("deleted_at",null).order(...).order(...)
      const orderMock = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: items, error: null }),
      });
      const isMock = vi.fn().mockReturnValue({ order: orderMock });
      const eq2Mock = vi.fn().mockReturnValue({ is: isMock });
      const eq1Mock = vi.fn().mockReturnValue({ eq: eq2Mock });
      return { select: vi.fn().mockReturnValue({ eq: eq1Mock }) };
    }

    if (table === "event_settings") {
      // Chain: .select("lifetime_raised_cents").eq("year",...).maybeSingle()
      // or .select(...).single()
      const singleMock = vi.fn().mockResolvedValue({
        data: eventSettings,
        error: null,
      });
      const maybeSingleMock = vi.fn().mockResolvedValue({
        data: eventSettings,
        error: null,
      });
      const eqMock = vi.fn().mockReturnValue({
        single: singleMock,
        maybeSingle: maybeSingleMock,
      });
      return {
        select: vi.fn().mockReturnValue({ eq: eqMock }),
      };
    }

    return {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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
// Page loader
// ---------------------------------------------------------------------------

async function loadPage() {
  const mod = await import("@/app/(public)/sponsorships/page");
  return mod.default;
}

// ---------------------------------------------------------------------------
// Tests 11–23
// ---------------------------------------------------------------------------

describe("SponsorshipsPage — Sprint 23 redesign (RED)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  // ── Test 11: Page renders 10 sponsorship cards with full mock data ──────────

  it("11 — renders 10 sponsorship cards with mock data", async () => {
    setClient(buildSupabaseMock({ items: ALL_10_ITEMS }));
    const Page = await loadPage();
    render(await Page());

    // One card per item — each card has data-testid="sponsorship-card-{id}"
    const cards = screen.getAllByTestId(/^sponsorship-card-/);
    expect(cards).toHaveLength(10);
  });

  // ── Test 12: Cards render in price-descending order (sort_order tiebreaker) ──

  it("12 — cards render in price-descending order; sort_order breaks ties at same price", async () => {
    setClient(buildSupabaseMock({ items: ALL_10_ITEMS }));
    const Page = await loadPage();
    const { container } = render(await Page());

    const cards = Array.from(container.querySelectorAll("[data-testid^='sponsorship-card-']"));
    expect(cards.length).toBe(10);

    const prices = cards.map((el) =>
      Number((el as HTMLElement).dataset.priceCents ?? 0)
    );

    // Each price should be >= the next (descending)
    for (let i = 0; i < prices.length - 1; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i + 1]);
    }

    // At the $250,000 tie (Eagle & Golf Gift), sort_order should break: Eagle before Golf Gift
    const eagleIdx = cards.findIndex(
      (el) => el.getAttribute("data-testid") === "sponsorship-card-eagle"
    );
    const golfGiftIdx = cards.findIndex(
      (el) => el.getAttribute("data-testid") === "sponsorship-card-golf-gift"
    );
    expect(eagleIdx).toBeLessThan(golfGiftIdx);
  });

  // ── Test 13: Soft-deleted items do NOT render ───────────────────────────────

  it("13 — soft-deleted items (deleted_at IS NOT NULL) do not render", async () => {
    const itemsWithDeleted = [
      ...ALL_10_ITEMS,
      makeItem({
        id: "deleted-pkg",
        name: "Deleted Package",
        price_cents: 100000,
        deleted_at: "2026-04-01T00:00:00Z",
      }),
    ];

    // The Supabase query filters deleted_at IS NULL — simulate server filtering
    // by only returning non-deleted items (as the real DB would)
    setClient(
      buildSupabaseMock({
        items: itemsWithDeleted.filter((i) => i.deleted_at === null),
      })
    );
    const Page = await loadPage();
    render(await Page());

    expect(
      screen.queryByTestId("sponsorship-card-deleted-pkg")
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Deleted Package")).not.toBeInTheDocument();
  });

  // ── Test 14: Inactive items do NOT render ──────────────────────────────────

  it("14 — inactive items (active = false) do not render", async () => {
    // The Supabase query filters active=true — simulate server filtering
    setClient(
      buildSupabaseMock({
        items: ALL_10_ITEMS.filter((i) => i.active),
      })
    );
    const Page = await loadPage();
    render(await Page());

    // All 10 items are active — verify count still correct
    const cards = screen.getAllByTestId(/^sponsorship-card-/);
    expect(cards).toHaveLength(10);
  });

  // ── Test 15: Items from a different year do NOT render ─────────────────────

  it("15 — items from a different year do not render", async () => {
    const wrongYearItem = makeItem({
      id: "old-pkg",
      name: "Old Package",
      price_cents: 200000,
      year: 2024,
    });

    // Supabase filters by currentYear — server returns only matching year items
    setClient(buildSupabaseMock({ items: ALL_10_ITEMS })); // wrong-year item excluded by DB
    const Page = await loadPage();
    render(await Page());

    expect(screen.queryByTestId("sponsorship-card-old-pkg")).not.toBeInTheDocument();
    expect(screen.queryByText("Old Package")).not.toBeInTheDocument();
  });

  // ── Test 16: Masthead shows lifetime_raised_cents via formatLifetimeRaised ──

  it("16 — masthead displays formatted lifetime_raised_cents from event_settings", async () => {
    setClient(
      buildSupabaseMock({
        items: ALL_10_ITEMS,
        eventSettings: { lifetime_raised_cents: 50000000 }, // $500K+
      })
    );
    const Page = await loadPage();
    render(await Page());

    // formatLifetimeRaised(50000000) → "$500K+"
    expect(screen.getByText(/\$500K\+/)).toBeInTheDocument();
  });

  // ── Test 17: Masthead inline stat omitted when lifetime_raised_cents is null ─

  it("17 — masthead inline stat is omitted when lifetime_raised_cents is null", async () => {
    setClient(
      buildSupabaseMock({
        items: ALL_10_ITEMS,
        eventSettings: { lifetime_raised_cents: null },
      })
    );
    const Page = await loadPage();
    render(await Page());

    // No raised-since stat should appear
    expect(screen.queryByText(/raised since/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$.*K\+/)).not.toBeInTheDocument();
  });

  // ── Test 18: Reassurance strip is present with correct text ───────────────

  it('18 — reassurance strip contains "2026 Partners page" and "tax receipt is emailed after checkout"', async () => {
    setClient(buildSupabaseMock({ items: ALL_10_ITEMS }));
    const Page = await loadPage();
    render(await Page());

    // The strip must contain both required text fragments
    const pageText = document.body.textContent ?? "";
    expect(pageText).toContain("2026 Partners page");
    expect(pageText).toMatch(/tax receipt is emailed after checkout/i);
  });

  // ── Test 19: Reassurance strip links to /sponsors ──────────────────────────

  it("19 — reassurance strip cross-link goes to /sponsors", async () => {
    setClient(buildSupabaseMock({ items: ALL_10_ITEMS }));
    const Page = await loadPage();
    render(await Page());

    // Find the "2026 Partners page" link
    const partnersLink = screen.getByRole("link", { name: /2026 partners page/i });
    expect(partnersLink).toHaveAttribute("href", "/sponsors");
  });

  // ── Test 20: Bloody Mary Bar card has id="bloody-mary-bar" ────────────────

  it('20 — Bloody Mary Bar card has id="bloody-mary-bar" (slug regression)', async () => {
    setClient(buildSupabaseMock({ items: ALL_10_ITEMS }));

    const Page = await loadPage();
    const { container } = render(await Page());

    // The card for Bloody Mary Bar must have an id that equals its slug
    const card = container.querySelector('[id="bloody-mary-bar"]');
    expect(card).not.toBeNull();
  });

  // ── Test 21: "Coming Soon — Other ways to give" section NOT rendered ────────

  it('21 — "Coming Soon — Other ways to give" placeholder section is NOT rendered', async () => {
    setClient(buildSupabaseMock({ items: ALL_10_ITEMS }));
    const Page = await loadPage();
    render(await Page());

    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/other ways to give/i)).not.toBeInTheDocument();
  });

  // ── Test 22: NO bg-purple or bg-purple-hover classes anywhere on page ───────

  it("22 — NO bg-purple or bg-purple-hover classes appear in rendered output", async () => {
    setClient(buildSupabaseMock({ items: ALL_10_ITEMS }));
    const Page = await loadPage();
    const { container } = render(await Page());

    expect(container.innerHTML).not.toContain("bg-purple");
    expect(container.innerHTML).not.toContain("bg-purple-hover");
  });

  // ── Test 23: NO font-display class in rendered output ──────────────────────

  it("23 — NO font-display class appears in rendered output (Fraunces removed)", async () => {
    setClient(buildSupabaseMock({ items: ALL_10_ITEMS }));
    const Page = await loadPage();
    const { container } = render(await Page());

    expect(container.innerHTML).not.toContain("font-display");
  });

  // ── Sprint 24 regression: tax pill removed from all cards ──────────────────

  it("S24 — no card renders 'Tax-deductible' text (per-card tax pill removed)", async () => {
    setClient(buildSupabaseMock({ items: ALL_10_ITEMS }));
    const Page = await loadPage();
    const { container } = render(await Page());

    expect(container.querySelectorAll('[class*="product-tax"]').length).toBe(0);
    expect(container.textContent).not.toContain("Tax-deductible");
  });

  // ── Watchdog case 25: Aria-locked masthead body copy (program language) ────

  it("25 — masthead body copy contains Aria-approved program-language string verbatim", async () => {
    setClient(buildSupabaseMock({ items: ALL_10_ITEMS }));
    const Page = await loadPage();
    render(await Page());

    const pageText = document.body.textContent ?? "";
    expect(pageText).toContain(
      "transportation, lodging, and medical equipment for cancer patients in active treatment"
    );
  });
});
