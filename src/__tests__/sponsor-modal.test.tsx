/**
 * Issue #380: SponsorModal delete-confirm — count fetch + Aria copy branches.
 *
 * RED state: SponsorModal does not yet call getSponsorPurchaseCount on delete-click;
 * buildDeleteDescription always returns the C2 zero-linked variant.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SponsorModal } from "@/app/admin/sponsors/sponsor-modal";
import type { Sponsor } from "@/types/database";
import type { SponsorshipItemOption } from "@/app/admin/sponsors/sponsor-form";

vi.mock("@/app/admin/sponsors/actions", () => ({
  createSponsor: vi.fn(),
  updateSponsor: vi.fn(),
  deleteSponsor: vi.fn(async () => ({ ok: true })),
  uploadSponsorLogo: vi.fn(async () => ({ url: "" })),
  deleteSponsorLogo: vi.fn(),
  getSponsorContacts: vi.fn(async () => []),
  getSponsorPurchaseCount: vi.fn(async () => 0),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { getSponsorPurchaseCount, deleteSponsor } from "@/app/admin/sponsors/actions";

const mockGetSponsorPurchaseCount = vi.mocked(getSponsorPurchaseCount);
const mockDeleteSponsor = vi.mocked(deleteSponsor);

const sponsorshipItems: SponsorshipItemOption[] = [
  { id: "tier-gold", name: "Gold", price_cents: 500000, year: 2026 },
];

function makeSponsor(overrides: Partial<Sponsor> = {}): Sponsor {
  return {
    id: "sponsor-uuid-1",
    name: "Carolina East Health",
    tier_id: "tier-gold",
    website: "https://example.com",
    logo_url: null,
    payment_status: "pending",
    amount_paid_cents: 500000,
    stripe_payment_id: null,
    display_order: 1,
    is_active: true,
    year: 2026,
    created_at: "2026-01-01T00:00:00.000Z",
    deleted_at: null,
    deleted_by: null,
    ...overrides,
  };
}

function renderModal(sponsor: Sponsor) {
  return render(
    <SponsorModal
      open={true}
      onOpenChange={vi.fn()}
      mode="edit"
      sponsor={sponsor}
      sponsorshipItems={sponsorshipItems}
      onSuccess={vi.fn()}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SponsorModal — delete-confirm count fetch (#380)", () => {
  it("calls getSponsorPurchaseCount with the sponsor id when Move to Trash is clicked", async () => {
    mockGetSponsorPurchaseCount.mockResolvedValueOnce(0);
    const user = userEvent.setup();
    renderModal(makeSponsor({ id: "sponsor-uuid-1" }));

    const trashButton = await screen.findByRole("button", { name: /move to trash/i });
    await user.click(trashButton);

    await waitFor(() => {
      expect(mockGetSponsorPurchaseCount).toHaveBeenCalledWith("sponsor-uuid-1");
    });
  });

  it("disables the Move to Trash button while the count fetch is pending", async () => {
    let resolveCount: (n: number) => void = () => {};
    mockGetSponsorPurchaseCount.mockReturnValueOnce(
      new Promise<number>((resolve) => {
        resolveCount = resolve;
      })
    );
    const user = userEvent.setup();
    renderModal(makeSponsor());

    const trashButton = await screen.findByRole("button", { name: /move to trash/i });
    await user.click(trashButton);

    await waitFor(() => {
      expect(trashButton).toBeDisabled();
    });

    resolveCount(0);
    await waitFor(() => {
      const buttons = screen.getAllByRole("button", { name: /move to trash/i });
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("opens the confirm dialog after the count resolves", async () => {
    mockGetSponsorPurchaseCount.mockResolvedValueOnce(0);
    const user = userEvent.setup();
    renderModal(makeSponsor({ name: "Carolina East Health" }));

    const trashButton = await screen.findByRole("button", { name: /move to trash/i });
    await user.click(trashButton);

    await waitFor(() => {
      expect(screen.getByText(/Delete Carolina East Health\?/i)).toBeInTheDocument();
    });
  });
});

describe("SponsorModal — delete-confirm Aria copy branches (#380)", () => {
  it("renders the C2 zero-linked copy when count is 0", async () => {
    mockGetSponsorPurchaseCount.mockResolvedValueOnce(0);
    const user = userEvent.setup();
    renderModal(makeSponsor({ name: "Carolina East Health" }));

    const trashButton = await screen.findByRole("button", { name: /move to trash/i });
    await user.click(trashButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          /Moving Carolina East Health to Trash removes it from the active list\. You can restore it from Admin → Trash\./
        )
      ).toBeInTheDocument();
    });
  });

  it("renders the C1 singular copy when count is 1", async () => {
    mockGetSponsorPurchaseCount.mockResolvedValueOnce(1);
    const user = userEvent.setup();
    renderModal(makeSponsor({ name: "Carolina East Health" }));

    const trashButton = await screen.findByRole("button", { name: /move to trash/i });
    await user.click(trashButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          /1 sponsorship purchase references this sponsor\. Moving Carolina East Health to Trash keeps that record intact — it'll display "Deleted sponsor" where the name appeared\./
        )
      ).toBeInTheDocument();
    });
  });

  it("renders the C1 plural copy when count is 2", async () => {
    mockGetSponsorPurchaseCount.mockResolvedValueOnce(2);
    const user = userEvent.setup();
    renderModal(makeSponsor({ name: "Carolina East Health" }));

    const trashButton = await screen.findByRole("button", { name: /move to trash/i });
    await user.click(trashButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          /2 sponsorship purchases reference this sponsor\. Moving Carolina East Health to Trash keeps those records intact — they'll display "Deleted sponsor" where the name appeared\./
        )
      ).toBeInTheDocument();
    });
  });

  it("renders the C1 plural copy with the actual count when count is 7", async () => {
    mockGetSponsorPurchaseCount.mockResolvedValueOnce(7);
    const user = userEvent.setup();
    renderModal(makeSponsor({ name: "Carolina East Health" }));

    const trashButton = await screen.findByRole("button", { name: /move to trash/i });
    await user.click(trashButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          /7 sponsorship purchases reference this sponsor\. Moving Carolina East Health to Trash keeps those records intact — they'll display "Deleted sponsor" where the name appeared\./
        )
      ).toBeInTheDocument();
    });
  });
});
