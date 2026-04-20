/**
 * S15-C — SponsorshipManager component tests
 *
 * Covers:
 * 1. Renders "Sponsors" column header between Sold and Max
 * 2. Each package row renders its active_sponsor_count in the Sponsors cell
 * 3. Package with active_sponsor_count: 0 renders literal "0"
 * 4. Delete on package with active_sponsor_count > 0 opens cascade warning dialog
 *    showing sponsor names from getLinkedSponsorNames
 * 5. Delete on package with active_sponsor_count === 0 uses normal confirm (no warning)
 * 6. After delete resolves, getSponsorshipItems is called again (refetch)
 * 7. Component does NOT call window.location.reload() on delete success
 * 8. After create/update resolves, getSponsorshipItems is called again (refetch)
 *
 * Seam test:
 * - getSponsorshipItems returning active_sponsor_count: 2 surfaces "2" in Sponsors cell
 *
 * RED phase — tests reference enriched SponsorshipItem type and new refetch/cascade
 * behaviour that the component does not yet implement.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Hoist mocks
// ---------------------------------------------------------------------------

const {
  mockGetSponsorshipItems,
  mockGetLinkedSponsorNames,
  mockCreateSponsorshipItem,
  mockUpdateSponsorshipItem,
  mockDeleteSponsorshipItem,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockGetSponsorshipItems: vi.fn(),
  mockGetLinkedSponsorNames: vi.fn(),
  mockCreateSponsorshipItem: vi.fn(),
  mockUpdateSponsorshipItem: vi.fn(),
  mockDeleteSponsorshipItem: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("@/app/admin/sponsorships/actions", () => ({
  getSponsorshipItems: mockGetSponsorshipItems,
  getLinkedSponsorNames: mockGetLinkedSponsorNames,
  createSponsorshipItem: mockCreateSponsorshipItem,
  updateSponsorshipItem: mockUpdateSponsorshipItem,
  deleteSponsorshipItem: mockDeleteSponsorshipItem,
  getSponsorshipPurchases: vi.fn().mockResolvedValue([]),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// Stub window.location.reload — jsdom doesn't implement it
Object.defineProperty(window, "location", {
  writable: true,
  value: { ...window.location, reload: vi.fn() },
});

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { SponsorshipManager } from "@/app/admin/sponsorships/sponsorship-manager";
import type { SponsorshipItem, SponsorshipPurchase } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Enriched row type expected after PR C lands */
type SponsorshipItemWithCount = SponsorshipItem & { active_sponsor_count: number };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<SponsorshipItemWithCount> = {}): SponsorshipItemWithCount {
  return {
    id: "tier-1",
    name: "Gold Package",
    description: "Logo on shirt",
    price_cents: 100000,
    max_quantity: 5,
    sold_count: 1,
    active: true,
    benefits: [],
    created_at: new Date().toISOString(),
    deleted_at: null,
    deleted_by: null,
    sort_order: 1,
    year: 2026,
    active_sponsor_count: 0,
    ...overrides,
  };
}

const NO_PURCHASES: SponsorshipPurchase[] = [];

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  // Default: getSponsorshipItems resolves empty on refetch
  mockGetSponsorshipItems.mockResolvedValue([]);
  // Default: getLinkedSponsorNames resolves empty
  mockGetLinkedSponsorNames.mockResolvedValue([]);
  // Default: delete succeeds
  mockDeleteSponsorshipItem.mockResolvedValue({ ok: true });
  // Default: create succeeds
  mockCreateSponsorshipItem.mockResolvedValue({ success: true });
  // Default: update succeeds
  mockUpdateSponsorshipItem.mockResolvedValue({ success: true });
  // Reset reload spy
  vi.mocked(window.location.reload as ReturnType<typeof vi.fn>).mockClear();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SponsorshipManager", () => {
  describe("Sponsors column header", () => {
    it('renders a "Sponsors" column header on the Packages table between Sold and Max', () => {
      render(<SponsorshipManager items={[makeItem()]} purchases={NO_PURCHASES} />);

      // Find the table header row
      const headers = screen.getAllByRole("columnheader");
      const headerTexts = headers.map((h) => h.textContent?.trim().toLowerCase() ?? "");

      const soldIdx = headerTexts.findIndex((t) => t.includes("sold"));
      const sponsorsIdx = headerTexts.findIndex((t) => /sponsors/i.test(t));
      const maxIdx = headerTexts.findIndex((t) => t.includes("max"));

      // "Sponsors" header must exist
      expect(sponsorsIdx).toBeGreaterThanOrEqual(0);
      // Must be positioned between Sold and Max
      expect(sponsorsIdx).toBeGreaterThan(soldIdx);
      expect(sponsorsIdx).toBeLessThan(maxIdx);
    });
  });

  describe("Sponsors column cell values", () => {
    it("each package row renders its active_sponsor_count in the Sponsors column cell", () => {
      const items = [
        makeItem({ id: "tier-1", name: "Gold", active_sponsor_count: 3 }),
        makeItem({ id: "tier-2", name: "Silver", active_sponsor_count: 2 }),
      ];

      render(<SponsorshipManager items={items} purchases={NO_PURCHASES} />);

      const rows = screen.getAllByRole("row");
      // Skip header row; find data rows by package name presence
      const goldRow = rows.find((r) => within(r).queryByText("Gold"));
      const silverRow = rows.find((r) => within(r).queryByText("Silver"));

      expect(goldRow).toBeDefined();
      expect(silverRow).toBeDefined();

      expect(within(goldRow!).getByText("3")).toBeInTheDocument();
      expect(within(silverRow!).getByText("2")).toBeInTheDocument();
    });

    it('a package with active_sponsor_count: 0 renders the literal "0" (not hidden)', () => {
      const items = [makeItem({ id: "tier-bronze", name: "Bronze", active_sponsor_count: 0 })];

      render(<SponsorshipManager items={items} purchases={NO_PURCHASES} />);

      const rows = screen.getAllByRole("row");
      const bronzeRow = rows.find((r) => within(r).queryByText("Bronze"));
      expect(bronzeRow).toBeDefined();

      // The literal "0" must be visible in the row
      expect(within(bronzeRow!).getByText("0")).toBeInTheDocument();
    });
  });

  describe("delete with linked sponsors (cascade warning)", () => {
    it("opens a confirm dialog containing sponsor names when active_sponsor_count > 0", async () => {
      const user = userEvent.setup();
      const item = makeItem({
        id: "tier-cascade",
        name: "Platinum Package",
        active_sponsor_count: 3,
      });

      mockGetLinkedSponsorNames.mockResolvedValue(["Acme Corp", "Beta LLC", "Gamma Inc"]);

      render(<SponsorshipManager items={[item]} purchases={NO_PURCHASES} />);

      // Open edit drawer by clicking the row
      await user.click(screen.getByText("Platinum Package"));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /delete package/i })).toBeInTheDocument()
      );

      // Click delete
      await user.click(screen.getByRole("button", { name: /delete package/i }));

      // Dialog must show sponsor names and cascade warning
      await waitFor(() => {
        expect(screen.getByText(/acme corp/i)).toBeInTheDocument();
        expect(screen.getByText(/beta llc/i)).toBeInTheDocument();
        expect(screen.getByText(/gamma inc/i)).toBeInTheDocument();
      });

      // Dialog must also show the count text
      await waitFor(() => {
        expect(screen.getByText(/3 sponsor/i)).toBeInTheDocument();
      });
    });

    it("does NOT show the cascade warning when active_sponsor_count === 0", async () => {
      const user = userEvent.setup();
      const item = makeItem({
        id: "tier-empty",
        name: "Empty Package",
        active_sponsor_count: 0,
      });

      mockGetLinkedSponsorNames.mockResolvedValue([]);

      render(<SponsorshipManager items={[item]} purchases={NO_PURCHASES} />);

      // Open edit drawer
      await user.click(screen.getByText("Empty Package"));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /delete package/i })).toBeInTheDocument()
      );

      // Click delete — normal confirm, no cascade warning
      await user.click(screen.getByRole("button", { name: /delete package/i }));

      await waitFor(() => {
        // Normal delete confirm dialog should open
        expect(
          screen.getByRole("dialog") || screen.getByRole("alertdialog")
        ).toBeInTheDocument();
      });

      // Sponsor cascade warning text must NOT appear
      expect(screen.queryByText(/sponsor.*linked/i)).not.toBeInTheDocument();
    });
  });

  describe("refetch after delete", () => {
    it("calls getSponsorshipItems again after delete resolves successfully", async () => {
      const user = userEvent.setup();
      const item = makeItem({ id: "tier-del", name: "Delete Me", active_sponsor_count: 0 });

      mockDeleteSponsorshipItem.mockResolvedValue({ ok: true });
      mockGetSponsorshipItems.mockResolvedValue([]);

      render(<SponsorshipManager items={[item]} purchases={NO_PURCHASES} />);

      // Open edit drawer
      await user.click(screen.getByText("Delete Me"));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /delete package/i })).toBeInTheDocument()
      );

      // Click delete → confirm dialog
      await user.click(screen.getByRole("button", { name: /delete package/i }));

      // Confirm deletion (standard confirm button)
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument()
      );
      await user.click(screen.getByRole("button", { name: /^delete$/i }));

      await waitFor(() => expect(mockDeleteSponsorshipItem).toHaveBeenCalledWith("tier-del"));

      // getSponsorshipItems must be called at least once (refetch)
      await waitFor(() => expect(mockGetSponsorshipItems).toHaveBeenCalled());
    });

    it("does NOT call window.location.reload() on delete success", async () => {
      const user = userEvent.setup();
      const item = makeItem({ id: "tier-noreload", name: "No Reload", active_sponsor_count: 0 });

      mockDeleteSponsorshipItem.mockResolvedValue({ ok: true });

      render(<SponsorshipManager items={[item]} purchases={NO_PURCHASES} />);

      // Open edit drawer
      await user.click(screen.getByText("No Reload"));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /delete package/i })).toBeInTheDocument()
      );

      // Click delete → confirm
      await user.click(screen.getByRole("button", { name: /delete package/i }));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument()
      );
      await user.click(screen.getByRole("button", { name: /^delete$/i }));

      await waitFor(() => expect(mockDeleteSponsorshipItem).toHaveBeenCalled());

      // window.location.reload must never be called
      expect(window.location.reload).not.toHaveBeenCalled();
    });
  });

  describe("refetch after create / update", () => {
    it("calls getSponsorshipItems again after create resolves successfully", async () => {
      const user = userEvent.setup();

      mockCreateSponsorshipItem.mockResolvedValue({ success: true });
      mockGetSponsorshipItems.mockResolvedValue([]);

      render(<SponsorshipManager items={[]} purchases={NO_PURCHASES} />);

      // Open create drawer
      await user.click(screen.getByRole("button", { name: /add package/i }));
      await waitFor(() => expect(screen.getByText(/new package/i)).toBeInTheDocument());

      // Fill required fields
      await user.type(screen.getByLabelText(/package name/i), "Silver Package");
      await user.type(screen.getByLabelText(/price/i), "500");

      // Submit
      await user.click(screen.getByRole("button", { name: /create/i }));

      await waitFor(() => expect(mockCreateSponsorshipItem).toHaveBeenCalledTimes(1));

      // getSponsorshipItems must be called (refetch)
      await waitFor(() => expect(mockGetSponsorshipItems).toHaveBeenCalled());
    });
  });
});

// ---------------------------------------------------------------------------
// Seam test: getSponsorshipItems → SponsorshipManager render
// ---------------------------------------------------------------------------

describe("SponsorshipManager ← actions (seam)", () => {
  it("given getSponsorshipItems returns active_sponsor_count: 2, Sponsors cell renders '2'", () => {
    // Contract: enriched item with active_sponsor_count flows from actions into the Sponsors column
    const enrichedItem = makeItem({
      id: "tier-1",
      name: "Gold",
      active_sponsor_count: 2,
    });

    // Simulate the component receiving the enriched type from the server action
    render(<SponsorshipManager items={[enrichedItem]} purchases={NO_PURCHASES} />);

    const rows = screen.getAllByRole("row");
    const goldRow = rows.find((r) => within(r).queryByText("Gold"));

    expect(goldRow).toBeDefined();
    expect(within(goldRow!).getByText("2")).toBeInTheDocument();
  });
});
