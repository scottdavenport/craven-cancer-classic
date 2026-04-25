/**
 * sponsorship-grid.test.tsx — Sprint 24
 *
 * Dialog interaction tests for SponsorshipGrid.
 * Covers: open on card click, ESC dismiss, Cancel dismiss, sold-out no-open.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/contact", () => ({
  CONTACT_EMAIL: "info@example.com",
  CONTACT_EMAIL_MAILTO: "mailto:info@example.com",
}));

vi.mock("@/lib/sponsorship-utils", () => ({
  slugifyItemName: (name: string) =>
    name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, ""),
}));

// Mock fetch — dialog opens immediately without network; only used when form submits
global.fetch = vi.fn();

import { SponsorshipGrid } from "@/app/(public)/sponsorships/sponsorship-grid";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const BASE_ITEMS = [
  {
    id: "champion",
    name: "Champion",
    price_cents: 500000,
    max_quantity: null,
    sold_count: 0,
    active: true,
    deleted_at: null,
    year: 2026,
    sort_order: 1,
    description: null,
    benefits: [],
    created_at: new Date().toISOString(),
    deleted_by: null,
  },
  {
    id: "eagle",
    name: "Eagle",
    price_cents: 250000,
    max_quantity: null,
    sold_count: 0,
    active: true,
    deleted_at: null,
    year: 2026,
    sort_order: 2,
    description: null,
    benefits: [],
    created_at: new Date().toISOString(),
    deleted_by: null,
  },
];

const SOLD_OUT_ITEMS = [
  {
    id: "bloody-mary-bar",
    name: "Bloody Mary Bar",
    price_cents: 50000,
    max_quantity: 1,
    sold_count: 1,
    active: true,
    deleted_at: null,
    year: 2026,
    sort_order: 7,
    description: null,
    benefits: [],
    created_at: new Date().toISOString(),
    deleted_by: null,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SponsorshipGrid — dialog interactions (Sprint 24)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1 — click 'Select package' opens dialog with PurchaseForm visible", async () => {
    const user = userEvent.setup();
    render(<SponsorshipGrid items={BASE_ITEMS as any} />);

    const selectBtn = screen.getAllByRole("button", { name: /select package/i })[0];
    await user.click(selectBtn);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Form field visible inside dialog
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /proceed to payment/i })).toBeInTheDocument();
  });

  it("2 — ESC key closes the dialog", async () => {
    const user = userEvent.setup();
    render(<SponsorshipGrid items={BASE_ITEMS as any} />);

    const selectBtn = screen.getAllByRole("button", { name: /select package/i })[0];
    await user.click(selectBtn);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await user.keyboard("[Escape]");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("3 — Cancel button inside the form closes the dialog", async () => {
    const user = userEvent.setup();
    render(<SponsorshipGrid items={BASE_ITEMS as any} />);

    const selectBtn = screen.getAllByRole("button", { name: /select package/i })[0];
    await user.click(selectBtn);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("4 — sold-out card click does NOT open dialog", async () => {
    const user = userEvent.setup();
    render(<SponsorshipGrid items={SOLD_OUT_ITEMS as any} />);

    // Sold-out button is disabled — pointer-events-none on parent + disabled attribute
    const soldOutBtn = screen.getByRole("button", { name: /sold out/i });
    expect(soldOutBtn).toBeDisabled();

    // Attempt click (should be a no-op due to disabled)
    fireEvent.click(soldOutBtn);

    // Dialog must not appear
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
