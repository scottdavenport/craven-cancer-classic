/**
 * S14-B — /admin/sponsorships drawer migration tests
 *
 * Exercises SponsorshipDrawer and SponsorshipManager:
 * - Click row → edit drawer opens with correct defaults
 * - "Add Package" button → create drawer opens
 * - Submit → action called → toast → drawer closes
 * - Delete footer button → ConfirmDialog → action called
 * - Cancel → drawer closes, no action called
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Hoist mocks — vi.hoisted ensures these are available before module init
// ---------------------------------------------------------------------------

const {
  mockCreateSponsorshipItem,
  mockUpdateSponsorshipItem,
  mockDeleteSponsorshipItem,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockCreateSponsorshipItem: vi.fn(),
  mockUpdateSponsorshipItem: vi.fn(),
  mockDeleteSponsorshipItem: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("@/app/admin/sponsorships/actions", () => ({
  createSponsorshipItem: mockCreateSponsorshipItem,
  updateSponsorshipItem: mockUpdateSponsorshipItem,
  deleteSponsorshipItem: mockDeleteSponsorshipItem,
  getSponsorshipItems: vi.fn().mockResolvedValue([]),
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
import { SponsorshipDrawer } from "@/app/admin/sponsorships/sponsorship-drawer";
import type { SponsorshipPurchase } from "@/types/database";
import type { SponsorshipItemWithCount } from "@/app/admin/sponsorships/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(
  overrides: Partial<SponsorshipItemWithCount> = {}
): SponsorshipItemWithCount {
  return {
    id: "item-1",
    name: "Gold Package",
    description: "Logo on shirt",
    price_cents: 100000,
    max_quantity: 5,
    sold_count: 1,
    active: true,
    benefits: [],
    category: "sponsorship" as const,
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
// Tests
// ---------------------------------------------------------------------------

describe("SponsorshipManager — drawer integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clicking a row opens the edit drawer with the package name in the title", async () => {
    const user = userEvent.setup();
    const items = [makeItem({ name: "Gold Package" })];

    render(<SponsorshipManager items={items} purchases={NO_PURCHASES} />);

    await user.click(screen.getByText("Gold Package"));

    // Drawer title should reflect the item name
    await waitFor(() =>
      expect(screen.getByText(/edit package.*gold package/i)).toBeInTheDocument()
    );
  });

  it('"Add Package" button opens create drawer', async () => {
    const user = userEvent.setup();

    render(<SponsorshipManager items={[]} purchases={NO_PURCHASES} />);

    await user.click(screen.getByRole("button", { name: /add package/i }));

    await waitFor(() =>
      expect(screen.getByText(/new package/i)).toBeInTheDocument()
    );
  });

  it("submitting create form calls createSponsorshipItem and shows success toast", async () => {
    const user = userEvent.setup();
    mockCreateSponsorshipItem.mockResolvedValue({ success: true });

    render(<SponsorshipManager items={[]} purchases={NO_PURCHASES} />);

    // Open create drawer
    await user.click(screen.getByRole("button", { name: /add package/i }));
    await waitFor(() => expect(screen.getByText(/new package/i)).toBeInTheDocument());

    // Fill in required fields
    await user.type(screen.getByLabelText(/package name/i), "Silver Package");
    await user.type(screen.getByLabelText(/price/i), "500");

    // Submit
    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => expect(mockCreateSponsorshipItem).toHaveBeenCalledTimes(1));
    expect(mockToastSuccess).toHaveBeenCalledWith("Package created");
  });

  it("submitting edit form calls updateSponsorshipItem and shows success toast", async () => {
    const user = userEvent.setup();
    const item = makeItem({ id: "item-99", name: "Bronze Package" });
    mockUpdateSponsorshipItem.mockResolvedValue({ success: true });

    render(<SponsorshipManager items={[item]} purchases={NO_PURCHASES} />);

    // Click row to open edit drawer
    await user.click(screen.getByText("Bronze Package"));
    await waitFor(() =>
      expect(screen.getByText(/edit package.*bronze package/i)).toBeInTheDocument()
    );

    // Submit without changing anything
    await user.click(screen.getByRole("button", { name: /update/i }));

    await waitFor(() =>
      expect(mockUpdateSponsorshipItem).toHaveBeenCalledWith("item-99", expect.any(FormData))
    );
    expect(mockToastSuccess).toHaveBeenCalledWith("Package updated");
  });

  it("delete footer button opens ConfirmDialog; confirming calls deleteSponsorshipItem", async () => {
    const user = userEvent.setup();
    const item = makeItem({ id: "item-del", name: "Platinum Package" });
    mockDeleteSponsorshipItem.mockResolvedValue({ ok: true });

    render(<SponsorshipManager items={[item]} purchases={NO_PURCHASES} />);

    // Open edit drawer
    await user.click(screen.getByText("Platinum Package"));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /delete package/i })).toBeInTheDocument()
    );

    // Click delete to open ConfirmDialog
    await user.click(screen.getByRole("button", { name: /delete package/i }));
    await waitFor(() =>
      expect(screen.getByText(/delete "platinum package"/i)).toBeInTheDocument()
    );

    // Confirm deletion
    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() =>
      expect(mockDeleteSponsorshipItem).toHaveBeenCalledWith("item-del")
    );
    expect(mockToastSuccess).toHaveBeenCalledWith("Package deleted");
  });

  it("cancel in create drawer closes it without calling any action", async () => {
    const user = userEvent.setup();

    render(<SponsorshipManager items={[]} purchases={NO_PURCHASES} />);

    await user.click(screen.getByRole("button", { name: /add package/i }));
    await waitFor(() => expect(screen.getByText(/new package/i)).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(mockCreateSponsorshipItem).not.toHaveBeenCalled();
    expect(mockUpdateSponsorshipItem).not.toHaveBeenCalled();
  });
});

describe("SponsorshipDrawer — standalone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create mode title when open=true mode=create", () => {
    render(
      <SponsorshipDrawer
        open={true}
        onOpenChange={vi.fn()}
        mode="create"
        sponsorship={null}
      />
    );

    expect(screen.getByText("New Package")).toBeInTheDocument();
  });

  it("renders edit mode title with item name when open=true mode=edit", () => {
    const item = makeItem({ name: "Diamond Package" });

    render(
      <SponsorshipDrawer
        open={true}
        onOpenChange={vi.fn()}
        mode="edit"
        sponsorship={item}
      />
    );

    expect(screen.getByText(/edit package.*diamond package/i)).toBeInTheDocument();
  });

  it("does not render delete button in create mode", () => {
    render(
      <SponsorshipDrawer
        open={true}
        onOpenChange={vi.fn()}
        mode="create"
        sponsorship={null}
      />
    );

    expect(
      screen.queryByRole("button", { name: /delete package/i })
    ).not.toBeInTheDocument();
  });
});
