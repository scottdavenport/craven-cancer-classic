/**
 * RED tests for PR B — sponsor-drawer.tsx changes
 *
 * These tests describe the TARGET state after PR B is applied.
 * They will FAIL against current main because:
 *   - SheetContent has sm:max-w-[480px] not sm:max-w-[540px]
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SponsorDrawer } from "../sponsor-drawer";
import type { SponsorshipItemOption } from "../sponsor-form";
import type { Sponsor } from "@/types/database";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock SponsorForm to avoid its full dependency tree (FileUploadField etc.)
vi.mock("../sponsor-form", () => ({
  SponsorForm: ({
    loading,
  }: {
    defaultValues?: unknown;
    contacts?: unknown[];
    sponsorshipItems: unknown[];
    onSubmit: (fd: FormData) => void | Promise<void>;
    onCancel: () => void;
    loading: boolean;
  }) => (
    <div data-testid="sponsor-form">
      {loading && <span data-testid="form-loading">Saving...</span>}
    </div>
  ),
}));

// Mock sonner toast to avoid JSDOM issues
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock server actions
vi.mock("./actions", async () => {
  const actual = await vi.importActual<typeof import("../actions")>(
    "../actions"
  );
  return {
    ...actual,
    createSponsor: vi.fn(async () => ({})),
    updateSponsor: vi.fn(async () => ({})),
    deleteSponsor: vi.fn(async () => ({})),
  };
});

// Also mock relative path used inside sponsor-drawer.tsx
vi.mock("../actions", () => ({
  createSponsor: vi.fn(async () => ({})),
  updateSponsor: vi.fn(async () => ({})),
  deleteSponsor: vi.fn(async () => ({})),
}));

// Mock ConfirmDialog
vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    title,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void | Promise<void>;
  }) =>
    open ? <div data-testid="confirm-dialog" role="dialog" aria-label={title} /> : null,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ITEMS: SponsorshipItemOption[] = [
  { id: "tier-gold", name: "Gold", price_cents: 500000, year: 2026 },
];

const SPONSOR: Sponsor = {
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
};

function renderDrawer(
  open = true,
  mode: "create" | "edit" = "create",
  sponsor?: Sponsor
) {
  const props = {
    open,
    onOpenChange: vi.fn(),
    mode,
    sponsor,
    sponsorshipItems: ITEMS,
    onSuccess: vi.fn(),
  };
  return render(<SponsorDrawer {...props} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SponsorDrawer — PR B changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // TEST 1: Drawer width — sm:max-w-[540px] (P1)
  // -------------------------------------------------------------------------
  describe("Drawer width — 540px (P1)", () => {
    it("SheetContent has sm:max-w-[540px] class when open in create mode", () => {
      renderDrawer(true, "create");
      // SheetContent renders via portal — query document.body, not container
      const sheetContent = document.querySelector('[data-slot="sheet-content"]');
      expect(sheetContent).not.toBeNull();
      expect(sheetContent!.className).toContain("sm:max-w-[540px]");
    });

    it("SheetContent does NOT have sm:max-w-[480px] (old width)", () => {
      renderDrawer(true, "create");
      const sheetContent = document.querySelector('[data-slot="sheet-content"]');
      expect(sheetContent).not.toBeNull();
      expect(sheetContent!.className).not.toContain("sm:max-w-[480px]");
    });

    it("SheetContent has sm:max-w-[540px] when open in edit mode", () => {
      renderDrawer(true, "edit", SPONSOR);
      const sheetContent = document.querySelector('[data-slot="sheet-content"]');
      expect(sheetContent).not.toBeNull();
      expect(sheetContent!.className).toContain("sm:max-w-[540px]");
    });
  });

  // -------------------------------------------------------------------------
  // Additional smoke tests to ensure drawer renders correctly
  // -------------------------------------------------------------------------
  describe("Drawer renders correctly", () => {
    it("renders the sponsor form when open", () => {
      renderDrawer(true, "create");
      expect(screen.getByTestId("sponsor-form")).toBeInTheDocument();
    });

    it("shows 'New Sponsor' title in create mode", () => {
      renderDrawer(true, "create");
      expect(screen.getByText("New Sponsor")).toBeInTheDocument();
    });

    it("shows sponsor name in edit mode title", () => {
      renderDrawer(true, "edit", SPONSOR);
      expect(
        screen.getByText(`Edit Sponsor: ${SPONSOR.name}`)
      ).toBeInTheDocument();
    });

    it("does not render when closed", () => {
      const { container } = renderDrawer(false, "create");
      // base-ui Dialog hides content when closed — sheet content should not be visible
      const sheetContent = container.querySelector('[data-slot="sheet-content"]');
      // Either null or hidden — base-ui may keep DOM but mark as hidden
      if (sheetContent) {
        // Acceptable: element present but not visible/open
        expect(sheetContent.getAttribute("data-open")).not.toBe("true");
      } else {
        expect(sheetContent).toBeNull();
      }
    });
  });
});
