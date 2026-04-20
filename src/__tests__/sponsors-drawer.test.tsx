import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SponsorList } from "@/app/admin/sponsors/sponsor-list";
import type { Sponsor } from "@/types/database";

// Mock server actions
vi.mock("@/app/admin/sponsors/actions", () => ({
  createSponsor: vi.fn(),
  updateSponsor: vi.fn(),
  deleteSponsor: vi.fn(),
  getSponsors: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  createSponsor,
  updateSponsor,
  deleteSponsor,
  getSponsors,
} from "@/app/admin/sponsors/actions";
import { toast } from "sonner";

const mockCreateSponsor = vi.mocked(createSponsor);
const mockUpdateSponsor = vi.mocked(updateSponsor);
const mockDeleteSponsor = vi.mocked(deleteSponsor);
const mockGetSponsors = vi.mocked(getSponsors);

function makeSponsor(overrides: Partial<Sponsor> = {}): Sponsor {
  return {
    id: "sponsor-uuid-1",
    name: "Acme Corp",
    tier_id: "tier-1",
    website: "https://acme.com",
    logo_url: null,
    payment_status: "pending",
    amount_paid_cents: 100000,
    stripe_payment_id: null,
    display_order: 1,
    is_active: true,
    year: 2026,
    created_at: new Date().toISOString(),
    deleted_at: null,
    deleted_by: null,
    ...overrides,
  };
}

const sponsorshipItems = [
  { id: "tier-1", name: "Gold", price_cents: 100000, year: 2026 },
  { id: "tier-2", name: "Silver", price_cents: 50000, year: 2026 },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSponsors.mockResolvedValue([]);
});

describe("SponsorList drawer integration", () => {
  it("clicking a row opens the drawer in edit mode with sponsor name in title", async () => {
    const user = userEvent.setup();
    const sponsor = makeSponsor({ name: "Acme Corp" });

    render(<SponsorList sponsors={[sponsor]} sponsorshipItems={sponsorshipItems} />);

    // Drawer should not be visible yet
    expect(screen.queryByText("Edit Sponsor: Acme Corp")).not.toBeInTheDocument();

    // Click the row
    await user.click(screen.getByText("Acme Corp"));

    // Drawer title should appear
    expect(screen.getByText("Edit Sponsor: Acme Corp")).toBeInTheDocument();
  });

  it("clicking 'New Sponsor' opens drawer in create mode with blank form", async () => {
    const user = userEvent.setup();

    render(<SponsorList sponsors={[]} sponsorshipItems={sponsorshipItems} />);

    await user.click(screen.getByRole("button", { name: /new sponsor/i }));

    // The SheetTitle renders as a heading
    expect(screen.getByRole("heading", { name: "New Sponsor" })).toBeInTheDocument();
    // The name input should be blank
    const nameInput = screen.getByLabelText(/sponsor name/i);
    expect(nameInput).toHaveValue("");
  });

  it("filling form and submitting calls createSponsor, closes drawer, shows toast", async () => {
    const user = userEvent.setup();
    mockCreateSponsor.mockResolvedValue({ success: true });
    mockGetSponsors.mockResolvedValue([]);

    render(<SponsorList sponsors={[]} sponsorshipItems={sponsorshipItems} />);

    await user.click(screen.getByRole("button", { name: /new sponsor/i }));

    // Fill sponsor name
    await user.type(screen.getByLabelText(/sponsor name/i), "New Corp");

    // Submit
    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(mockCreateSponsor).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Sponsor created");
    });
    // Drawer should close — heading no longer visible
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "New Sponsor" })).not.toBeInTheDocument();
    });
  });

  it("clicking Delete in drawer footer shows ConfirmDialog; confirming calls deleteSponsor", async () => {
    const user = userEvent.setup();
    const sponsor = makeSponsor({ name: "Delete Me Corp" });
    mockDeleteSponsor.mockResolvedValue({ ok: true });
    mockGetSponsors.mockResolvedValue([]);

    render(<SponsorList sponsors={[sponsor]} sponsorshipItems={sponsorshipItems} />);

    // Open edit drawer
    await user.click(screen.getByText("Delete Me Corp"));
    expect(screen.getByText("Edit Sponsor: Delete Me Corp")).toBeInTheDocument();

    // Click Delete sponsor button in footer
    await user.click(screen.getByRole("button", { name: /delete sponsor/i }));

    // ConfirmDialog should appear
    expect(
      screen.getByText(/delete delete me corp/i)
    ).toBeInTheDocument();

    // Confirm deletion
    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockDeleteSponsor).toHaveBeenCalledWith(sponsor.id);
    });
  });

  it("clicking Cancel closes the drawer without calling any action", async () => {
    const user = userEvent.setup();

    render(<SponsorList sponsors={[]} sponsorshipItems={sponsorshipItems} />);

    await user.click(screen.getByRole("button", { name: /new sponsor/i }));
    expect(screen.getByRole("heading", { name: "New Sponsor" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "New Sponsor" })).not.toBeInTheDocument();
    });

    expect(mockCreateSponsor).not.toHaveBeenCalled();
    expect(mockUpdateSponsor).not.toHaveBeenCalled();
  });
});
