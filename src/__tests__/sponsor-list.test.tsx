import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fireEvent } from "@testing-library/react";
import { SponsorList } from "@/app/admin/sponsors/sponsor-list";
import type { Sponsor } from "@/types/database";
import type { SponsorshipItemOption } from "@/app/admin/sponsors/sponsor-form";

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

import { getSponsors, deleteSponsor } from "@/app/admin/sponsors/actions";

const mockGetSponsors = vi.mocked(getSponsors);
const mockDeleteSponsor = vi.mocked(deleteSponsor);

// Seed sponsorship items — tier-orphan is intentionally absent
const sponsorshipItems: SponsorshipItemOption[] = [
  { id: "tier-gold", name: "Gold", price_cents: 500000, year: 2026 },
  { id: "tier-silver", name: "Silver", price_cents: 250000, year: 2026 },
];

function makeSponsor(overrides: Partial<Sponsor> = {}): Sponsor {
  return {
    id: "sponsor-uuid-1",
    name: "Acme Corp",
    tier_id: "tier-gold",
    contact_name: "Jane Doe",
    contact_email: "jane@acme.com",
    contact_phone: null,
    website: "https://acme.com",
    logo_url: null,
    payment_status: "pending",
    amount_paid_cents: 500000,
    stripe_payment_id: null,
    display_order: 1,
    year: 2026,
    created_at: "2026-01-01T00:00:00.000Z",
    deleted_at: null,
    deleted_by: null,
    ...overrides,
  };
}

// Seed data: 4 sponsors with mixed payment_status and mixed tier_ids.
// IMPORTANT: Input order is intentionally NOT in the expected output order —
// pending sponsors are listed last so unsorted render would put them at the
// bottom. Sorting tests must re-order to pass.
const seedSponsors: Sponsor[] = [
  makeSponsor({
    id: "s2",
    name: "Blue Ridge Bank",
    tier_id: "tier-silver",
    contact_name: "Bob Baker",
    website: "https://blueridgebank.com",
    payment_status: "paid",
    amount_paid_cents: 250000,
  }),
  makeSponsor({
    id: "s3",
    name: "Cedar Lawn Care",
    tier_id: "tier-orphan", // NOT in sponsorshipItems — deleted package
    contact_name: "Carol Chen",
    website: "https://cedarlawn.com",
    payment_status: "comped",
    amount_paid_cents: 0,
  }),
  makeSponsor({
    id: "s4",
    name: "Delta Dental",
    tier_id: "tier-gold",
    contact_name: "Dave Diaz",
    website: "https://deltadental.com",
    payment_status: "pending",
    amount_paid_cents: 500000,
  }),
  makeSponsor({
    id: "s1",
    name: "Apex Roofing",
    tier_id: "tier-gold",
    contact_name: "Alice Anderson",
    website: "https://apexroofing.com",
    payment_status: "pending",
    amount_paid_cents: 500000,
  }),
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSponsors.mockResolvedValue([]);
});

describe("SponsorList", () => {
  describe("search input", () => {
    it("renders a search input with accessible placeholder", () => {
      render(
        <SponsorList sponsors={seedSponsors} sponsorshipItems={sponsorshipItems} />
      );
      expect(
        screen.getByPlaceholderText(/search sponsors/i)
      ).toBeInTheDocument();
    });

    it("typing in the search input narrows rows by sponsor name (case-insensitive)", async () => {
      const user = userEvent.setup();
      render(
        <SponsorList sponsors={seedSponsors} sponsorshipItems={sponsorshipItems} />
      );

      const searchInput = screen.getByPlaceholderText(/search sponsors/i);
      await user.type(searchInput, "apex");

      expect(screen.getByText("Apex Roofing")).toBeInTheDocument();
      expect(screen.queryByText("Blue Ridge Bank")).not.toBeInTheDocument();
      expect(screen.queryByText("Cedar Lawn Care")).not.toBeInTheDocument();
    });

    it("typing in the search input narrows rows by contact_name", async () => {
      const user = userEvent.setup();
      render(
        <SponsorList sponsors={seedSponsors} sponsorshipItems={sponsorshipItems} />
      );

      const searchInput = screen.getByPlaceholderText(/search sponsors/i);
      await user.type(searchInput, "Bob Baker");

      expect(screen.getByText("Blue Ridge Bank")).toBeInTheDocument();
      expect(screen.queryByText("Apex Roofing")).not.toBeInTheDocument();
    });

    it("typing in the search input narrows rows by website", async () => {
      const user = userEvent.setup();
      render(
        <SponsorList sponsors={seedSponsors} sponsorshipItems={sponsorshipItems} />
      );

      const searchInput = screen.getByPlaceholderText(/search sponsors/i);
      await user.type(searchInput, "cedarlawn");

      expect(screen.getByText("Cedar Lawn Care")).toBeInTheDocument();
      expect(screen.queryByText("Apex Roofing")).not.toBeInTheDocument();
      expect(screen.queryByText("Blue Ridge Bank")).not.toBeInTheDocument();
    });

    it("typing in the search input narrows rows by tier name resolved through sponsorshipItems", async () => {
      const user = userEvent.setup();
      render(
        <SponsorList sponsors={seedSponsors} sponsorshipItems={sponsorshipItems} />
      );

      const searchInput = screen.getByPlaceholderText(/search sponsors/i);
      await user.type(searchInput, "silver");

      // Only Blue Ridge Bank has tier-silver
      expect(screen.getByText("Blue Ridge Bank")).toBeInTheDocument();
      expect(screen.queryByText("Apex Roofing")).not.toBeInTheDocument();
      expect(screen.queryByText("Cedar Lawn Care")).not.toBeInTheDocument();
    });
  });

  describe("column sort", () => {
    it("clicking the Name column header toggles sort asc→desc→asc", async () => {
      const user = userEvent.setup();
      render(
        <SponsorList sponsors={seedSponsors} sponsorshipItems={sponsorshipItems} />
      );

      const nameHeader = screen.getByRole("columnheader", { name: /name/i });

      // First click: ascending — Apex first
      await user.click(nameHeader);
      const rowsAsc = screen.getAllByRole("row");
      // rowsAsc[0] is header; rowsAsc[1] should be the first data row
      expect(within(rowsAsc[1]).getByText("Apex Roofing")).toBeInTheDocument();

      // Second click: descending — Delta first
      await user.click(nameHeader);
      const rowsDesc = screen.getAllByRole("row");
      expect(within(rowsDesc[1]).getByText("Delta Dental")).toBeInTheDocument();

      // Third click: back to ascending — Apex first again
      await user.click(nameHeader);
      const rowsAsc2 = screen.getAllByRole("row");
      expect(within(rowsAsc2[1]).getByText("Apex Roofing")).toBeInTheDocument();
    });

    it("the active sort column renders an arrow indicator (↑ or ↓)", async () => {
      const user = userEvent.setup();
      render(
        <SponsorList sponsors={seedSponsors} sponsorshipItems={sponsorshipItems} />
      );

      const nameHeader = screen.getByRole("columnheader", { name: /name/i });
      await user.click(nameHeader);

      expect(nameHeader.textContent).toMatch(/[↑↓]/);
    });
  });

  describe("default sort order", () => {
    it("rows with payment_status='pending' appear before paid and comped", () => {
      render(
        <SponsorList sponsors={seedSponsors} sponsorshipItems={sponsorshipItems} />
      );

      const rows = screen.getAllByRole("row");
      // rows[0] = header; rows[1..] = data
      const dataRows = rows.slice(1);

      // First two rows should both be pending sponsors
      const firstRowText = dataRows[0].textContent ?? "";
      const secondRowText = dataRows[1].textContent ?? "";
      expect(firstRowText + secondRowText).toMatch(/pending/);

      // The last row (comped) should appear after paid
      const lastRowText = dataRows[dataRows.length - 1].textContent ?? "";
      expect(lastRowText).toMatch(/comped/);
    });

    it("within the same payment_status, rows are sorted by name A→Z", () => {
      render(
        <SponsorList sponsors={seedSponsors} sponsorshipItems={sponsorshipItems} />
      );

      const rows = screen.getAllByRole("row");
      const dataRows = rows.slice(1);

      // Both pending sponsors: Apex Roofing (s1) and Delta Dental (s4)
      // Apex < Delta alphabetically — Apex should come first
      const pendingRows = dataRows.filter((r) =>
        r.textContent?.includes("pending")
      );
      expect(pendingRows.length).toBeGreaterThanOrEqual(2);
      expect(pendingRows[0].textContent).toContain("Apex Roofing");
      expect(pendingRows[1].textContent).toContain("Delta Dental");
    });
  });

  describe("deleted package placeholder", () => {
    it("a sponsor whose tier_id is NOT in sponsorshipItems renders the literal text '(deleted package)' in the tier cell", () => {
      render(
        <SponsorList sponsors={seedSponsors} sponsorshipItems={sponsorshipItems} />
      );

      // Cedar Lawn Care has tier-orphan which is not in sponsorshipItems
      expect(screen.getByText("(deleted package)")).toBeInTheDocument();
    });
  });

  describe("refetch on delete", () => {
    it("after the delete action resolves, getSponsors is called again", async () => {
      const user = userEvent.setup();
      mockDeleteSponsor.mockResolvedValue({ ok: true } as never);
      mockGetSponsors.mockResolvedValue([]);

      render(
        <SponsorList
          sponsors={[
            makeSponsor({ id: "del-1", name: "Delete Me Corp" }),
          ]}
          sponsorshipItems={sponsorshipItems}
        />
      );

      // Open the edit drawer by clicking the sponsor row
      await user.click(screen.getByText("Delete Me Corp"));
      expect(screen.getByText("Edit Sponsor: Delete Me Corp")).toBeInTheDocument();

      // Click the delete button in the drawer footer
      await user.click(screen.getByRole("button", { name: /delete sponsor/i }));

      // Confirm dialog should appear — click confirm
      const confirmBtn = screen.getByRole("button", { name: /^delete$/i });
      await user.click(confirmBtn);

      // deleteSponsor resolves → onSuccess fires → refetch → getSponsors called
      await vi.waitFor(() => {
        expect(mockGetSponsors).toHaveBeenCalledTimes(1);
      });
    });
  });
});
