/**
 * admin-sponsorships-category-filter.test.tsx — Sprint 33 RED phase
 *
 * Pins the contract for the category filter chip on /admin/sponsorships:
 * 1. Default filter chip = "All" — all items and purchases shown
 * 2. Filtering to "Tribute" shows only tribute-category items (Balloons)
 * 3. Filtering to "Sponsorship" shows only sponsorship-category items
 * 4. Filtering to "Supporter" shows only supporter-category items
 * 5. Filter applies to both the catalog list AND the purchases panel
 * 6. Filter chip uses custom Select component (not native <select>)
 *    per feedback_no_system_ui
 * 7. "Tribute" filter reveals tribute_recipient column in purchases panel
 *
 * RED reason: CategoryFilter component does not exist. SponsorshipManager
 * does not accept or render a category filter. Tests fail until Bolt lands
 * the Phase 2 admin UI changes.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Hoist mocks
// ---------------------------------------------------------------------------

const {
  mockGetSponsorshipItems,
  mockGetLinkedSponsorNames,
  mockGetSponsorshipPurchases,
  mockCreateSponsorshipItem,
  mockUpdateSponsorshipItem,
  mockDeleteSponsorshipItem,
} = vi.hoisted(() => ({
  mockGetSponsorshipItems: vi.fn(),
  mockGetLinkedSponsorNames: vi.fn(),
  mockGetSponsorshipPurchases: vi.fn(),
  mockCreateSponsorshipItem: vi.fn(),
  mockUpdateSponsorshipItem: vi.fn(),
  mockDeleteSponsorshipItem: vi.fn(),
}));

vi.mock("@/app/admin/sponsorships/actions", () => ({
  getSponsorshipItems: mockGetSponsorshipItems,
  getLinkedSponsorNames: mockGetLinkedSponsorNames,
  getSponsorshipPurchases: mockGetSponsorshipPurchases,
  createSponsorshipItem: mockCreateSponsorshipItem,
  updateSponsorshipItem: mockUpdateSponsorshipItem,
  deleteSponsorshipItem: mockDeleteSponsorshipItem,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { SponsorshipManager } from "@/app/admin/sponsorships/sponsorship-manager";
import type { SponsorshipItem, SponsorshipPurchase } from "@/types/database";

// ---------------------------------------------------------------------------
// Types (Sprint 33 extended shapes)
// ---------------------------------------------------------------------------

type SponsorshipCategory = "sponsorship" | "tribute" | "supporter";

type SponsorshipItemWithCount = SponsorshipItem & {
  active_sponsor_count: number;
  category: SponsorshipCategory;
};

type SponsorshipPurchaseWithRecipient = SponsorshipPurchase & {
  tribute_recipient: string | null;
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeItem(
  overrides: Partial<SponsorshipItemWithCount> = {}
): SponsorshipItemWithCount {
  return {
    id: "tier-default",
    name: "Default Package",
    description: null,
    price_cents: 100000,
    max_quantity: null,
    sold_count: 0,
    active: true,
    benefits: [],
    created_at: new Date().toISOString(),
    deleted_at: null,
    deleted_by: null,
    sort_order: 0,
    year: new Date().getFullYear(),
    active_sponsor_count: 0,
    category: "sponsorship",
    ...overrides,
  };
}

function makePurchase(
  overrides: Partial<SponsorshipPurchaseWithRecipient> = {}
): SponsorshipPurchaseWithRecipient {
  return {
    id: "purchase-default",
    item_id: "tier-default",
    purchaser_name: "Jane Doe",
    purchaser_email: "jane@example.com",
    purchaser_phone: null,
    company_name: null,
    payment_status: "paid",
    amount_paid_cents: 10000,
    stripe_payment_id: "pi_test",
    sponsor_id: null,
    year: new Date().getFullYear(),
    created_at: new Date().toISOString(),
    tribute_recipient: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Catalog items representing all 3 categories
// ---------------------------------------------------------------------------

const CHAMPION_ITEM = makeItem({
  id: "item-champion",
  name: "Champion",
  price_cents: 500000,
  category: "sponsorship",
});

const EAGLE_ITEM = makeItem({
  id: "item-eagle",
  name: "Eagle",
  price_cents: 250000,
  category: "sponsorship",
});

const BALLOONS_ITEM = makeItem({
  id: "item-balloons",
  name: "Balloons",
  price_cents: 2000,
  category: "tribute",
});

const TEE_SIGN_ITEM = makeItem({
  id: "item-tee-sign",
  name: "Tee Sign",
  price_cents: 10000,
  category: "supporter",
});

const YARD_SIGN_ITEM = makeItem({
  id: "item-yard-sign",
  name: "Yard Sign",
  price_cents: 10000,
  category: "supporter",
});

const ALL_ITEMS = [
  CHAMPION_ITEM,
  EAGLE_ITEM,
  BALLOONS_ITEM,
  TEE_SIGN_ITEM,
  YARD_SIGN_ITEM,
];

// ---------------------------------------------------------------------------
// Purchases across all categories
// ---------------------------------------------------------------------------

const SPONSORSHIP_PURCHASE = makePurchase({
  id: "purchase-champion",
  item_id: "item-champion",
  purchaser_name: "Acme Corp",
  tribute_recipient: null,
});

const TRIBUTE_PURCHASE = makePurchase({
  id: "purchase-balloons",
  item_id: "item-balloons",
  purchaser_name: "Jane Doe",
  tribute_recipient: "John Davenport",
});

const SUPPORTER_PURCHASE = makePurchase({
  id: "purchase-tee-sign",
  item_id: "item-tee-sign",
  purchaser_name: "Bob Smith",
  tribute_recipient: null,
});

const ALL_PURCHASES = [
  SPONSORSHIP_PURCHASE,
  TRIBUTE_PURCHASE,
  SUPPORTER_PURCHASE,
];

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

function renderManager(opts: {
  items?: SponsorshipItemWithCount[];
  purchases?: SponsorshipPurchaseWithRecipient[];
} = {}) {
  const items = opts.items ?? ALL_ITEMS;
  const purchases = opts.purchases ?? ALL_PURCHASES;

  mockGetSponsorshipItems.mockResolvedValue(items);
  mockGetSponsorshipPurchases.mockResolvedValue(purchases);
  mockGetLinkedSponsorNames.mockResolvedValue([]);

  return render(
    <SponsorshipManager
      items={items as unknown as Parameters<typeof SponsorshipManager>[0]["items"]}
      purchases={purchases as unknown as SponsorshipPurchase[]}
    />
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SponsorshipManager — category filter chip (Sprint 33)", () => {
  describe("default state — filter = All", () => {
    it("renders a category filter control with 'All' as default selection", () => {
      renderManager();
      // The filter chip/select must be present with "All" as the active option
      const filterControl = screen.getByTestId("category-filter");
      expect(filterControl).toBeInTheDocument();
    });

    it("shows all items from all categories when filter is 'All'", () => {
      renderManager();
      expect(screen.getByText("Champion")).toBeInTheDocument();
      expect(screen.getByText("Balloons")).toBeInTheDocument();
      expect(screen.getByText("Tee Sign")).toBeInTheDocument();
    });

    it("shows all purchases from all categories when filter is 'All'", () => {
      renderManager();
      // All purchaser names should appear in the purchases panel
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    });

    it("filter control does not use native <select> element (per feedback_no_system_ui)", () => {
      const { container } = renderManager();
      // Must not use a native select element
      const nativeSelects = container.querySelectorAll("select");
      expect(nativeSelects.length).toBe(0);
    });
  });

  describe("filtering to 'Tribute'", () => {
    it("shows only Balloons in catalog when Tribute filter is active", async () => {
      renderManager();

      const filterControl = screen.getByTestId("category-filter");
      // Click/select the Tribute option
      await userEvent.click(filterControl);
      const tributeOption = screen.getByRole("option", { name: /tribute/i });
      await userEvent.click(tributeOption);

      await waitFor(() => {
        expect(screen.getByText("Balloons")).toBeInTheDocument();
        expect(screen.queryByText("Champion")).not.toBeInTheDocument();
        expect(screen.queryByText("Eagle")).not.toBeInTheDocument();
        expect(screen.queryByText("Tee Sign")).not.toBeInTheDocument();
      });
    });

    it("shows only tribute purchases in purchases panel when Tribute filter is active", async () => {
      renderManager();

      const filterControl = screen.getByTestId("category-filter");
      await userEvent.click(filterControl);
      const tributeOption = screen.getByRole("option", { name: /tribute/i });
      await userEvent.click(tributeOption);

      await waitFor(() => {
        expect(screen.getByText("Jane Doe")).toBeInTheDocument();
        expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
        expect(screen.queryByText("Bob Smith")).not.toBeInTheDocument();
      });
    });

    it("tribute_recipient column is visible in purchases panel when Tribute filter is active", async () => {
      renderManager();

      const filterControl = screen.getByTestId("category-filter");
      await userEvent.click(filterControl);
      const tributeOption = screen.getByRole("option", { name: /tribute/i });
      await userEvent.click(tributeOption);

      await waitFor(() => {
        // The tribute recipient name must appear in the purchases panel
        expect(screen.getByText("John Davenport")).toBeInTheDocument();
      });
    });
  });

  describe("filtering to 'Sponsorship'", () => {
    it("shows only sponsorship-category items in catalog when Sponsorship filter is active", async () => {
      renderManager();

      const filterControl = screen.getByTestId("category-filter");
      await userEvent.click(filterControl);
      const sponsorshipOption = screen.getByRole("option", { name: /^sponsorship$/i });
      await userEvent.click(sponsorshipOption);

      await waitFor(() => {
        expect(screen.getByText("Champion")).toBeInTheDocument();
        expect(screen.getByText("Eagle")).toBeInTheDocument();
        expect(screen.queryByText("Balloons")).not.toBeInTheDocument();
        expect(screen.queryByText("Tee Sign")).not.toBeInTheDocument();
      });
    });

    it("shows only sponsorship purchases in purchases panel when Sponsorship filter is active", async () => {
      renderManager();

      const filterControl = screen.getByTestId("category-filter");
      await userEvent.click(filterControl);
      const sponsorshipOption = screen.getByRole("option", { name: /^sponsorship$/i });
      await userEvent.click(sponsorshipOption);

      await waitFor(() => {
        expect(screen.getByText("Acme Corp")).toBeInTheDocument();
        expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
        expect(screen.queryByText("Bob Smith")).not.toBeInTheDocument();
      });
    });
  });

  describe("filtering to 'Supporter'", () => {
    it("shows only supporter-category items in catalog when Supporter filter is active", async () => {
      renderManager();

      const filterControl = screen.getByTestId("category-filter");
      await userEvent.click(filterControl);
      const supporterOption = screen.getByRole("option", { name: /supporter/i });
      await userEvent.click(supporterOption);

      await waitFor(() => {
        expect(screen.getByText("Tee Sign")).toBeInTheDocument();
        expect(screen.getByText("Yard Sign")).toBeInTheDocument();
        expect(screen.queryByText("Champion")).not.toBeInTheDocument();
        expect(screen.queryByText("Balloons")).not.toBeInTheDocument();
      });
    });

    it("shows only supporter purchases in purchases panel when Supporter filter is active", async () => {
      renderManager();

      const filterControl = screen.getByTestId("category-filter");
      await userEvent.click(filterControl);
      const supporterOption = screen.getByRole("option", { name: /supporter/i });
      await userEvent.click(supporterOption);

      await waitFor(() => {
        expect(screen.getByText("Bob Smith")).toBeInTheDocument();
        expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
        expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
      });
    });
  });

  describe("resetting to 'All' from a filtered state", () => {
    it("shows all items again after resetting to 'All'", async () => {
      renderManager();

      const filterControl = screen.getByTestId("category-filter");

      // Switch to Tribute
      await userEvent.click(filterControl);
      await userEvent.click(screen.getByRole("option", { name: /tribute/i }));

      await waitFor(() => {
        expect(screen.queryByText("Champion")).not.toBeInTheDocument();
      });

      // Reset to All
      await userEvent.click(filterControl);
      await userEvent.click(screen.getByRole("option", { name: /^all$/i }));

      await waitFor(() => {
        expect(screen.getByText("Champion")).toBeInTheDocument();
        expect(screen.getByText("Balloons")).toBeInTheDocument();
        expect(screen.getByText("Tee Sign")).toBeInTheDocument();
      });
    });
  });
});
