/**
 * sections.test.tsx — Sprint 33 RED phase
 *
 * Pins the contract for the three-section layout of /sponsorships:
 * 1. Three sections render in order: Sponsorships → Tributes → Supporters
 * 2. Each section shows only items of its category
 * 3. Sections have correct headings/identifiable markers
 * 4. Sponsorships section comes before Tributes section in DOM order
 * 5. Tributes section comes before Supporters section in DOM order
 *
 * RED reason: The current /sponsorships page renders a single grid with all
 * items. The three-section layout (SponsorshipSection, TributeSection,
 * SupporterSection) does not exist. Tests fail until Bolt implements Phase 3.
 *
 * Mock strategy: three category-filtered queries (one per section).
 * If Bolt implements a single query partitioned client-side, the mock
 * needs updating to match — this test documents the expected render contract
 * regardless of implementation strategy.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
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

// Mock the new section components — they don't exist yet.
// These stubs let us verify the page imports and renders them with correct props.

vi.mock("@/app/(public)/sponsorships/sponsorship-section", () => ({
  SponsorshipSection: ({
    items,
  }: {
    items: Array<{ id: string; name: string; price_cents: number }>;
  }) => (
    <section data-testid="section-sponsorships" data-section-type="sponsorship">
      <h2>Sponsorships</h2>
      {items.map((item) => (
        <div key={item.id} data-testid={`sponsorship-item-${item.id}`}>
          {item.name}
        </div>
      ))}
    </section>
  ),
}));

vi.mock("@/app/(public)/sponsorships/tribute-section", () => ({
  TributeSection: ({
    items,
  }: {
    items: Array<{ id: string; name: string; price_cents: number }>;
  }) => (
    <section data-testid="section-tributes" data-section-type="tribute">
      <h2>Tributes</h2>
      {items.map((item) => (
        <div key={item.id} data-testid={`tribute-item-${item.id}`}>
          {item.name}
        </div>
      ))}
    </section>
  ),
}));

vi.mock("@/app/(public)/sponsorships/supporter-section", () => ({
  SupporterSection: ({
    items,
  }: {
    items: Array<{ id: string; name: string; price_cents: number }>;
  }) => (
    <section data-testid="section-supporters" data-section-type="supporter">
      <h2>Supporters</h2>
      {items.map((item) => (
        <div key={item.id} data-testid={`supporter-item-${item.id}`}>
          {item.name}
        </div>
      ))}
    </section>
  ),
}));

// Mock existing components that the page might import
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

// Mock the old SponsorshipGrid which the current page uses
vi.mock("@/app/(public)/sponsorships/sponsorship-grid", () => ({
  SponsorshipGrid: ({
    items,
  }: {
    items: Array<{ id: string; name: string; price_cents: number }>;
  }) => (
    <div data-testid="sponsorship-grid-stub">
      {items.map((item) => (
        <div key={item.id} data-testid={`sponsorship-card-${item.id}`}>
          {item.name}
        </div>
      ))}
    </div>
  ),
}));

import * as serverModule from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Data factories
// ---------------------------------------------------------------------------

type MockItem = {
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
  category: "sponsorship" | "tribute" | "supporter";
};

function makeItem(overrides: Partial<MockItem> = {}): MockItem {
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
    category: "sponsorship",
    ...overrides,
  };
}

const SPONSORSHIP_ITEMS: MockItem[] = [
  makeItem({ id: "champion", name: "Champion", price_cents: 500000, sort_order: 1, category: "sponsorship" }),
  makeItem({ id: "eagle", name: "Eagle", price_cents: 250000, sort_order: 2, category: "sponsorship" }),
  makeItem({ id: "golf-carts", name: "Golf Carts", price_cents: 100000, sort_order: 3, category: "sponsorship" }),
];

const TRIBUTE_ITEMS: MockItem[] = [
  makeItem({ id: "balloons", name: "Balloons", price_cents: 2000, sort_order: 14, category: "tribute" }),
];

const SUPPORTER_ITEMS: MockItem[] = [
  makeItem({ id: "tee-sign", name: "Tee Sign", price_cents: 10000, sort_order: 15, category: "supporter" }),
  makeItem({ id: "yard-sign", name: "Yard Sign", price_cents: 10000, sort_order: 16, category: "supporter" }),
];

// ---------------------------------------------------------------------------
// Supabase mock builder
// ---------------------------------------------------------------------------

function buildSupabaseMock(opts: {
  sponsorshipItems?: MockItem[];
  tributeItems?: MockItem[];
  supporterItems?: MockItem[];
} = {}) {
  const {
    sponsorshipItems = SPONSORSHIP_ITEMS,
    tributeItems = TRIBUTE_ITEMS,
    supporterItems = SUPPORTER_ITEMS,
  } = opts;

  // The page may query with .eq('category', 'sponsorship') etc., or
  // it may do a single query and partition client-side.
  // We support both patterns: the mock returns category-appropriate items
  // based on the .eq chain.

  const allItems = [...sponsorshipItems, ...tributeItems, ...supporterItems];

  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === "sponsorship_items_active" || table === "sponsorship_items") {
      // Build a chainable mock that handles .eq('category', ...) filtering
      let resolvedItems = allItems;

      // Support double .order() chain: .order(...).order(...).resolves(data)
      const orderMock = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: resolvedItems, error: null }),
      });

      const isMock = vi.fn().mockReturnValue({ order: orderMock });

      const eqCategoryMock = vi.fn((field: string, value: string) => {
        if (field === "category") {
          resolvedItems = allItems.filter((i) => i.category === value);
          // Return a fresh chain with the filtered result
          const filteredOrderMock = vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: resolvedItems, error: null }),
          });
          const filteredIsMock = vi.fn().mockReturnValue({ order: filteredOrderMock });
          return {
            is: filteredIsMock,
            order: vi.fn().mockResolvedValue({ data: resolvedItems, error: null }),
            eq: eqCategoryMock,
          };
        }
        return {
          is: isMock,
          order: orderMock,
          eq: eqCategoryMock,
        };
      });

      const eq1Mock = vi.fn().mockReturnValue({
        eq: eqCategoryMock,
        is: isMock,
        order: orderMock,
      });

      return {
        select: vi.fn().mockReturnValue({ eq: eq1Mock }),
      };
    }

    if (table === "event_settings") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { lifetime_raised_cents: null }, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: { lifetime_raised_cents: null }, error: null }),
          }),
        }),
      };
    }

    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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

async function loadPage() {
  const mod = await import("@/app/(public)/sponsorships/page");
  return mod.default;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.resetModules();
});

describe("SponsorshipsPage — three-section layout (Sprint 33 RED)", () => {
  describe("section presence", () => {
    it("renders a Sponsorships section", async () => {
      setClient(buildSupabaseMock());
      const Page = await loadPage();
      render(await Page());
      expect(screen.getByTestId("section-sponsorships")).toBeInTheDocument();
    });

    it("renders a Tributes section", async () => {
      setClient(buildSupabaseMock());
      const Page = await loadPage();
      render(await Page());
      expect(screen.getByTestId("section-tributes")).toBeInTheDocument();
    });

    it("renders a Supporters section", async () => {
      setClient(buildSupabaseMock());
      const Page = await loadPage();
      render(await Page());
      expect(screen.getByTestId("section-supporters")).toBeInTheDocument();
    });
  });

  describe("section order (DOM ordering)", () => {
    it("Sponsorships section appears before Tributes section in DOM", async () => {
      setClient(buildSupabaseMock());
      const Page = await loadPage();
      const { container } = render(await Page());

      const sections = Array.from(
        container.querySelectorAll("[data-testid^='section-']")
      ).map((el) => el.getAttribute("data-testid"));

      const sponsorshipIdx = sections.indexOf("section-sponsorships");
      const tributeIdx = sections.indexOf("section-tributes");

      expect(sponsorshipIdx).toBeGreaterThanOrEqual(0);
      expect(tributeIdx).toBeGreaterThanOrEqual(0);
      expect(sponsorshipIdx).toBeLessThan(tributeIdx);
    });

    it("Tributes section appears before Supporters section in DOM", async () => {
      setClient(buildSupabaseMock());
      const Page = await loadPage();
      const { container } = render(await Page());

      const sections = Array.from(
        container.querySelectorAll("[data-testid^='section-']")
      ).map((el) => el.getAttribute("data-testid"));

      const tributeIdx = sections.indexOf("section-tributes");
      const supporterIdx = sections.indexOf("section-supporters");

      expect(tributeIdx).toBeGreaterThanOrEqual(0);
      expect(supporterIdx).toBeGreaterThanOrEqual(0);
      expect(tributeIdx).toBeLessThan(supporterIdx);
    });

    it("section order is Sponsorships → Tributes → Supporters", async () => {
      setClient(buildSupabaseMock());
      const Page = await loadPage();
      const { container } = render(await Page());

      const sections = Array.from(
        container.querySelectorAll("[data-testid^='section-']")
      ).map((el) => el.getAttribute("data-testid"));

      // The three sections must appear in this relative order
      const sponsorshipIdx = sections.indexOf("section-sponsorships");
      const tributeIdx = sections.indexOf("section-tributes");
      const supporterIdx = sections.indexOf("section-supporters");

      expect(sponsorshipIdx).toBeLessThan(tributeIdx);
      expect(tributeIdx).toBeLessThan(supporterIdx);
    });
  });

  describe("correct items per section", () => {
    it("Sponsorships section contains Champion, Eagle, Golf Carts items", async () => {
      setClient(buildSupabaseMock());
      const Page = await loadPage();
      render(await Page());

      expect(screen.getByTestId("sponsorship-item-champion")).toBeInTheDocument();
      expect(screen.getByTestId("sponsorship-item-eagle")).toBeInTheDocument();
      expect(screen.getByTestId("sponsorship-item-golf-carts")).toBeInTheDocument();
    });

    it("Tributes section contains Balloons item", async () => {
      setClient(buildSupabaseMock());
      const Page = await loadPage();
      render(await Page());

      expect(screen.getByTestId("tribute-item-balloons")).toBeInTheDocument();
    });

    it("Supporters section contains Tee Sign and Yard Sign items", async () => {
      setClient(buildSupabaseMock());
      const Page = await loadPage();
      render(await Page());

      expect(screen.getByTestId("supporter-item-tee-sign")).toBeInTheDocument();
      expect(screen.getByTestId("supporter-item-yard-sign")).toBeInTheDocument();
    });

    it("Balloons does NOT appear in the Sponsorships section", async () => {
      setClient(buildSupabaseMock());
      const Page = await loadPage();
      render(await Page());

      // Balloons should only be in tributes section, not sponsorships section
      expect(screen.queryByTestId("sponsorship-item-balloons")).not.toBeInTheDocument();
    });

    it("Champion does NOT appear in the Tributes section", async () => {
      setClient(buildSupabaseMock());
      const Page = await loadPage();
      render(await Page());

      expect(screen.queryByTestId("tribute-item-champion")).not.toBeInTheDocument();
    });

    it("Tee Sign does NOT appear in the Sponsorships section", async () => {
      setClient(buildSupabaseMock());
      const Page = await loadPage();
      render(await Page());

      expect(screen.queryByTestId("sponsorship-item-tee-sign")).not.toBeInTheDocument();
    });
  });

  describe("section headings", () => {
    it("Sponsorships section has a heading containing 'Sponsorships'", async () => {
      setClient(buildSupabaseMock());
      const Page = await loadPage();
      render(await Page());

      const section = screen.getByTestId("section-sponsorships");
      expect(section).toHaveTextContent(/sponsorships/i);
    });

    it("Tributes section has a heading containing 'Tribute'", async () => {
      setClient(buildSupabaseMock());
      const Page = await loadPage();
      render(await Page());

      const section = screen.getByTestId("section-tributes");
      expect(section).toHaveTextContent(/tribute/i);
    });

    it("Supporters section has a heading containing 'Supporter'", async () => {
      setClient(buildSupabaseMock());
      const Page = await loadPage();
      render(await Page());

      const section = screen.getByTestId("section-supporters");
      expect(section).toHaveTextContent(/supporter/i);
    });
  });

  describe("empty sections", () => {
    it("renders gracefully when no tribute items exist", async () => {
      setClient(buildSupabaseMock({ tributeItems: [] }));
      const Page = await loadPage();
      render(await Page());

      // Should not crash — tribute section may render empty state or nothing
      expect(screen.getByTestId("section-sponsorships")).toBeInTheDocument();
      expect(screen.getByTestId("section-supporters")).toBeInTheDocument();
    });

    it("renders gracefully when no supporter items exist", async () => {
      setClient(buildSupabaseMock({ supporterItems: [] }));
      const Page = await loadPage();
      render(await Page());

      expect(screen.getByTestId("section-sponsorships")).toBeInTheDocument();
      expect(screen.getByTestId("section-tributes")).toBeInTheDocument();
    });
  });
});
