/**
 * RED tests for PR B — sponsor-list.tsx changes
 *
 * These tests describe the TARGET state after PR B is applied.
 * They will FAIL against current main because:
 *   - Year filter is a native <select>, not base-ui Select
 *   - Status filter active state uses bg-teal-600 not bg-primary
 *   - No logo thumbnail column exists
 *   - Empty state is bare text in a <TableCell>, not AdminEmptyState
 *   - AdminEmptyState (@/components/admin/admin-empty-state) does not exist yet (PR A)
 */

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SponsorList } from "../sponsor-list";
import type { SponsorshipItemOption } from "../sponsor-form";
import type { Sponsor } from "@/types/database";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock server action — SponsorList calls getSponsors on filter change
vi.mock("../actions", () => ({
  getSponsors: vi.fn(async () => []),
  createSponsor: vi.fn(),
  updateSponsor: vi.fn(),
  deleteSponsor: vi.fn(),
  getSponsorPurchaseCount: vi.fn(async () => 0),
}));

// Mock SponsorModal to avoid rendering the full dialog
vi.mock("../sponsor-modal", () => ({
  SponsorModal: ({
    open,
    mode,
  }: {
    open: boolean;
    mode: string;
    onOpenChange: (v: boolean) => void;
    sponsor?: unknown;
    sponsorshipItems: unknown[];
    onSuccess: () => void;
  }) =>
    open ? (
      <div data-testid="sponsor-drawer" data-mode={mode} />
    ) : null,
}));

// AdminEmptyState will be created in PR A. Mock it so RED tests describe its
// usage without requiring the file to exist.
vi.mock("@/components/admin/admin-empty-state", () => ({
  AdminEmptyState: ({
    title,
    body,
    action,
  }: {
    title: string;
    body?: string;
    action?: React.ReactNode;
  }) => (
    <div data-testid="admin-empty-state">
      <h3 data-testid="admin-empty-state-title">{title}</h3>
      {body && <p data-testid="admin-empty-state-body">{body}</p>}
      {action && <div data-testid="admin-empty-state-action">{action}</div>}
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ITEMS: SponsorshipItemOption[] = [
  { id: "tier-gold", name: "Gold", price_cents: 500000, year: 2026 },
];

function makeSponsor(overrides: Partial<Sponsor> = {}): Sponsor {
  return {
    id: "s-1",
    name: "Acme Corp",
    tier_id: "tier-gold",
    website: "https://acme.com",
    payment_status: "paid",
    amount_paid_cents: 500000,
    year: 2026,
    is_active: true,
    logo_url: null,
    created_at: "2026-01-01T00:00:00Z",
    deleted_at: null,
    deleted_by: null,
    display_order: 0,
    stripe_payment_id: null,
    ...overrides,
  };
}

function renderList(sponsors: Sponsor[] = [], items: SponsorshipItemOption[] = ITEMS) {
  return render(<SponsorList sponsors={sponsors} sponsorshipItems={items} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SponsorList — PR B changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // TEST 1: Year filter uses base-ui Select, not native <select> (P1)
  // -------------------------------------------------------------------------
  describe("Year filter — base-ui Select (P1)", () => {
    it("has zero native <select> elements in the filter bar", () => {
      const { container } = renderList();
      const nativeSelects = container.querySelectorAll("select");
      expect(nativeSelects).toHaveLength(0);
    });

    it("year filter combobox trigger has data-slot=select-trigger (base-ui)", () => {
      const { container } = renderList();
      // base-ui SelectTrigger renders with data-slot="select-trigger"
      // Current native <select> does NOT have data-slot
      const selectTrigger = container.querySelector(
        '[data-slot="select-trigger"][aria-label="Year"], [data-slot="select-trigger"][data-testid="year-filter-trigger"]'
      );
      expect(selectTrigger).not.toBeNull();
    });

    it("year filter trigger has data-testid=year-filter-trigger", () => {
      renderList();
      // Bolt should add data-testid="year-filter-trigger" for reliable querying
      expect(screen.getByTestId("year-filter-trigger")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // TEST 2: Year filter Select.Root has items prop (per feedback_base_ui_select_items)
  // -------------------------------------------------------------------------
  describe("Year filter items prop (feedback_base_ui_select_items)", () => {
    it("year filter trigger displays the selected year label (not raw String(value))", () => {
      renderList([makeSponsor({ year: 2026 })]);
      // The trigger should display "2026" as a label (items prop maps number→string)
      const trigger = screen.getByTestId("year-filter-trigger");
      expect(trigger).toHaveTextContent("2026");
    });
  });

  // -------------------------------------------------------------------------
  // TEST 3: Status filter active state uses bg-primary, not bg-teal-600 (P1)
  // -------------------------------------------------------------------------
  describe("Status filter — bg-primary token (P1)", () => {
    it("active 'All' button has bg-primary class not bg-teal-600", () => {
      renderList();
      const allButton = screen.getByTestId("status-filter-all");
      expect(allButton.className).toContain("bg-primary");
      expect(allButton.className).not.toContain("bg-teal-600");
    });

    it("clicking 'Active' filter makes that button use bg-primary", () => {
      renderList();
      const activeButton = screen.getByTestId("status-filter-active");
      fireEvent.click(activeButton);
      expect(activeButton.className).toContain("bg-primary");
      expect(activeButton.className).not.toContain("bg-teal-600");
    });

    it("inactive status button uses bg-primary when selected", () => {
      renderList();
      const inactiveButton = screen.getByTestId("status-filter-inactive");
      fireEvent.click(inactiveButton);
      expect(inactiveButton.className).toContain("bg-primary");
      expect(inactiveButton.className).not.toContain("bg-teal-600");
    });

    it("active text color on selected status button uses text-primary-foreground (not text-white)", () => {
      renderList();
      // Current code uses text-white; target uses text-primary-foreground (design token)
      const allButton = screen.getByTestId("status-filter-all");
      expect(allButton.className).toContain("text-primary-foreground");
      expect(allButton.className).not.toContain("text-white");
    });
  });

  // -------------------------------------------------------------------------
  // TEST 4: Logo thumbnail column (NEW)
  // -------------------------------------------------------------------------
  describe("Logo thumbnail column in sponsor table (NEW)", () => {
    it("renders an <img> in the row when sponsor has logo_url", () => {
      const sponsor = makeSponsor({ logo_url: "/logos/acme.svg" });
      renderList([sponsor]);
      const img = screen.getByRole("img", { hidden: true });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "/logos/acme.svg");
    });

    it("img has object-contain class and fixed size classes", () => {
      const sponsor = makeSponsor({ logo_url: "/logos/acme.svg" });
      renderList([sponsor]);
      const img = screen.getByRole("img", { hidden: true });
      expect(img.className).toContain("object-contain");
      // Should have some fixed size: w-8, h-8 or similar
      const hasSize =
        img.className.includes("w-8") ||
        img.className.includes("h-8") ||
        img.className.includes("size-8");
      expect(hasSize).toBe(true);
    });

    it("renders a placeholder element (not broken img) when logo_url is null", () => {
      const sponsor = makeSponsor({ logo_url: null });
      const { container } = renderList([sponsor]);

      // Should NOT render an <img> for null logo
      const imgs = container.querySelectorAll("img");
      expect(imgs).toHaveLength(0);

      // Should render a placeholder — a div or span in the logo cell
      // Bolt will add data-testid="logo-placeholder" for reliable selection
      expect(screen.getByTestId("logo-placeholder")).toBeInTheDocument();
    });

    it("logo column header is present in the table", () => {
      renderList([makeSponsor()]);
      // Table header for logo column (text like "Logo" or an img aria-label)
      const logoHeader = screen.queryByRole("columnheader", { name: /logo/i });
      expect(logoHeader).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // TEST 5: Logo onError fallback (NEW)
  // -------------------------------------------------------------------------
  describe("Logo onError fallback (NEW)", () => {
    it("renders fallback placeholder when img fires onerror", () => {
      const sponsor = makeSponsor({
        id: "s-broken",
        logo_url: "https://broken.example.com/logo.svg",
      });
      renderList([sponsor]);

      const img = screen.getByRole("img", { hidden: true });
      expect(img).toBeInTheDocument();

      // Simulate broken image
      fireEvent.error(img);

      // After error, fallback should render and img should not remain
      // Bolt should swap to data-testid="logo-placeholder" on error
      expect(screen.getByTestId("logo-placeholder")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // TEST 6: AdminEmptyState replaces bare "No sponsors yet" text (NEW)
  // -------------------------------------------------------------------------
  describe("AdminEmptyState for empty list (NEW)", () => {
    it("renders AdminEmptyState when sponsor list is empty", () => {
      renderList([]);
      expect(screen.getByTestId("admin-empty-state")).toBeInTheDocument();
    });

    it("AdminEmptyState title contains 'No sponsors'", () => {
      renderList([]);
      const title = screen.getByTestId("admin-empty-state-title");
      expect(title.textContent).toMatch(/no sponsors/i);
    });

    it("does NOT render bare 'No sponsors yet' text inside a TableCell", () => {
      renderList([]);
      // The old bare text was inside a <td>; it should be replaced by AdminEmptyState
      const allCells = document.querySelectorAll("td");
      const hasBareCellText = Array.from(allCells).some((td) =>
        td.textContent?.toLowerCase().includes("no sponsors yet")
      );
      expect(hasBareCellText).toBe(false);
    });

    it("does not render AdminEmptyState when sponsors are present", () => {
      renderList([makeSponsor()]);
      expect(screen.queryByTestId("admin-empty-state")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // TEST 7: Logo thumbnail clickable (lightbox) — #213
  // -------------------------------------------------------------------------
  describe("Logo thumbnail lightbox (#213)", () => {
    it("thumbnail renders inside a clickable DialogTrigger", () => {
      const sponsor = makeSponsor({ logo_url: "/logos/acme.svg", name: "Acme Corp" });
      renderList([sponsor]);
      const trigger = screen.getByTestId("logo-thumbnail-trigger");
      expect(trigger).toBeInTheDocument();
      expect(trigger.getAttribute("aria-label")).toMatch(/acme corp/i);
    });

    it("opens a dialog with the larger logo on click", async () => {
      const user = userEvent.setup();
      const sponsor = makeSponsor({ logo_url: "/logos/acme.svg", name: "Acme Corp" });
      renderList([sponsor]);

      await user.click(screen.getByTestId("logo-thumbnail-trigger"));

      const dialogTitle = await screen.findByText(/acme corp logo/i);
      expect(dialogTitle).toBeInTheDocument();
    });

    it("thumbnail click does not propagate to the row edit handler", async () => {
      const user = userEvent.setup();
      const sponsor = makeSponsor({ logo_url: "/logos/acme.svg", name: "Acme Corp" });
      renderList([sponsor]);

      await user.click(screen.getByTestId("logo-thumbnail-trigger"));

      expect(screen.queryByTestId("sponsor-drawer")).not.toBeInTheDocument();
    });
  });
});
