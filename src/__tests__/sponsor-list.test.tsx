import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fireEvent } from "@testing-library/react";
import { SponsorList } from "@/app/admin/sponsors/sponsor-list";
import type { Sponsor } from "@/types/database";
import type { SponsorshipItemOption } from "@/app/admin/sponsors/sponsor-form";

// Extend Sponsor with PR-B fields not yet in generated types
type SponsorWithStatus = Sponsor & { is_active?: boolean };

// Mock server actions
vi.mock("@/app/admin/sponsors/actions", () => ({
  createSponsor: vi.fn(),
  updateSponsor: vi.fn(),
  deleteSponsor: vi.fn(),
  getSponsors: vi.fn(),
  uploadSponsorLogo: vi.fn(async () => ({ url: "" })),
  getSponsorContacts: vi.fn(async () => []),
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
    website: "https://acme.com",
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

// Seed data: 4 sponsors with mixed payment_status and mixed tier_ids.
// IMPORTANT: Input order is intentionally NOT in the expected output order —
// pending sponsors are listed last so unsorted render would put them at the
// bottom. Sorting tests must re-order to pass.
const seedSponsors: Sponsor[] = [
  makeSponsor({
    id: "s2",
    name: "Blue Ridge Bank",
    tier_id: "tier-silver",
    website: "https://blueridgebank.com",
    payment_status: "paid",
    amount_paid_cents: 250000,
  }),
  makeSponsor({
    id: "s3",
    name: "Cedar Lawn Care",
    tier_id: "tier-orphan", // NOT in sponsorshipItems — deleted package
    website: "https://cedarlawn.com",
    payment_status: "comped",
    amount_paid_cents: 0,
  }),
  makeSponsor({
    id: "s4",
    name: "Delta Dental",
    tier_id: "tier-gold",
    website: "https://deltadental.com",
    payment_status: "pending",
    amount_paid_cents: 500000,
  }),
  makeSponsor({
    id: "s1",
    name: "Apex Roofing",
    tier_id: "tier-gold",
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

      // Open the edit modal via RowActions trash icon (Phase 2: row click no longer opens modal)
      await user.click(screen.getByRole("button", { name: /delete delete me corp/i }));
      expect(screen.getByText("Edit Sponsor: Delete Me Corp")).toBeInTheDocument();

      // Click "Move to Trash" in the modal footer (Phase 2: replaces old "Delete sponsor" button)
      await user.click(screen.getByRole("button", { name: /move to trash/i }));

      // Confirm dialog should appear — click "Move to Trash" to confirm
      const confirmBtn = screen.getByRole("button", { name: /move to trash/i });
      await user.click(confirmBtn);

      // deleteSponsor resolves → onSuccess fires → refetch → getSponsors called
      await vi.waitFor(() => {
        expect(mockGetSponsors).toHaveBeenCalledTimes(1);
      });
    });
  });
});

// ---------------------------------------------------------------------------
// S18-B (RED): SponsorList — year filter (#199)
// ---------------------------------------------------------------------------
// These tests FAIL until Bolt adds a year filter control to SponsorList.
// ---------------------------------------------------------------------------

describe("SponsorList — year filter (#199)", () => {
  const currentYear = new Date().getFullYear();

  // Bug 4 (RED-phase): base-ui Select renders options in a portal attached to
  // document.body. In the full suite, portal remnants from prior tests linger
  // and cause option discovery to fail (finds stale options or finds none).
  // Clearing document.body before each test in this block eliminates portal
  // bleed-over. Tradeoff: this resets ALL portal state, not just Select portals.
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders a year filter control (dropdown, select, or combobox)", () => {
    render(
      <SponsorList sponsors={seedSponsors} sponsorshipItems={sponsorshipItems} />
    );
    // Bolt may render a <select>, custom Select, or combobox — pin on any year-related control
    const yearControl =
      screen.queryByRole("combobox", { name: /year/i }) ??
      screen.queryByLabelText(/year/i) ??
      screen.queryByDisplayValue(String(currentYear));
    expect(yearControl).toBeInTheDocument();
  });

  it("year filter default value is current year", () => {
    render(
      <SponsorList sponsors={seedSponsors} sponsorshipItems={sponsorshipItems} />
    );
    // The current year string should appear somewhere in the year filter area
    const yearText = screen.queryByDisplayValue(String(currentYear)) ??
      screen.queryByText(String(currentYear));
    expect(yearText).toBeInTheDocument();
  });

  it("changing year triggers getSponsors with the new year", async () => {
    const user = userEvent.setup();
    mockGetSponsors.mockResolvedValue([]);

    render(
      <SponsorList sponsors={seedSponsors} sponsorshipItems={sponsorshipItems} />
    );

    const trigger = screen.getByTestId("year-filter-trigger");
    await user.click(trigger);
    const option = await screen.findByRole("option", { name: "2025" });
    await user.click(option);

    await vi.waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const calls = mockGetSponsors.mock.calls as any[][];
      const yearCall = calls.find((args) => {
        const arg = args[0] as Record<string, unknown> | undefined;
        return arg?.year === 2025;
      });
      expect(yearCall).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// S18-B (RED): SponsorList — status filter (#199)
// ---------------------------------------------------------------------------
// These tests FAIL until Bolt adds a status filter to SponsorList.
// ---------------------------------------------------------------------------

describe("SponsorList — status filter (#199)", () => {
  it("renders a status filter with options All / Active / Inactive", () => {
    render(
      <SponsorList sponsors={seedSponsors} sponsorshipItems={sponsorshipItems} />
    );
    // All three text options must be present in the filter UI
    // They may be radio buttons, a select, or a segmented control
    expect(screen.queryByText(/^all$/i) ?? screen.queryByRole("option", { name: /^all$/i })).toBeInTheDocument();
    expect(screen.queryByText(/^active$/i) ?? screen.queryByRole("option", { name: /^active$/i })).toBeInTheDocument();
    expect(screen.queryByText(/^inactive$/i) ?? screen.queryByRole("option", { name: /^inactive$/i })).toBeInTheDocument();
  });

  it("default status filter is 'All'", () => {
    render(
      <SponsorList sponsors={seedSponsors} sponsorshipItems={sponsorshipItems} />
    );
    // "All" should be the initially selected/active option
    // It may be aria-selected, aria-pressed, or data-state="active"
    const allOption =
      screen.queryByRole("radio", { name: /^all$/i }) ??
      screen.queryByRole("option", { name: /^all$/i });

    if (allOption) {
      const isSelected =
        allOption.getAttribute("aria-selected") === "true" ||
        allOption.getAttribute("aria-checked") === "true" ||
        (allOption as HTMLInputElement).checked;
      expect(isSelected).toBe(true);
    } else {
      // Fallback: the "All" text is visible (implying it's the current filter label)
      expect(screen.getByText(/^all$/i)).toBeInTheDocument();
    }
  });

  it("selecting 'Active' triggers getSponsors with is_active=true", async () => {
    const user = userEvent.setup();
    mockGetSponsors.mockResolvedValue([]);

    render(
      <SponsorList sponsors={seedSponsors} sponsorshipItems={sponsorshipItems} />
    );

    const activeOption =
      screen.queryByRole("radio", { name: /^active$/i }) ??
      screen.queryByRole("button", { name: /^active$/i }) ??
      screen.queryByText(/^active$/i);

    expect(activeOption).toBeInTheDocument();
    await user.click(activeOption!);

    await vi.waitFor(() => {
      expect(mockGetSponsors).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const calls = mockGetSponsors.mock.calls as any[][];
      const activeCall = calls.find((args) => {
        const arg = args[0] as Record<string, unknown> | undefined;
        return arg?.is_active === true;
      });
      expect(activeCall).toBeDefined();
    });
  });

  it("selecting 'Inactive' triggers getSponsors with is_active=false", async () => {
    const user = userEvent.setup();
    mockGetSponsors.mockResolvedValue([]);

    render(
      <SponsorList sponsors={seedSponsors} sponsorshipItems={sponsorshipItems} />
    );

    const inactiveOption =
      screen.queryByRole("radio", { name: /^inactive$/i }) ??
      screen.queryByRole("button", { name: /^inactive$/i }) ??
      screen.queryByText(/^inactive$/i);

    expect(inactiveOption).toBeInTheDocument();
    await user.click(inactiveOption!);

    await vi.waitFor(() => {
      expect(mockGetSponsors).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const calls = mockGetSponsors.mock.calls as any[][];
      const inactiveCall = calls.find((args) => {
        const arg = args[0] as Record<string, unknown> | undefined;
        return arg?.is_active === false;
      });
      expect(inactiveCall).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// S18-B (RED): SponsorList — inactive badge (#199)
// ---------------------------------------------------------------------------
// These tests FAIL until Bolt adds is_active=false badge rendering to SponsorList.
// ---------------------------------------------------------------------------

describe("SponsorList — inactive badge (#199)", () => {
  function makeSponsorWithStatus(overrides: Partial<SponsorWithStatus> = {}): SponsorWithStatus {
    return {
      id: "sponsor-badge-test",
      name: "Badge Test Corp",
      tier_id: "tier-gold",
      website: null,
      logo_url: null,
      payment_status: "paid",
      amount_paid_cents: 0,
      stripe_payment_id: null,
      display_order: 1,
      year: 2026,
      created_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
      deleted_by: null,
      is_active: true,
      ...overrides,
    };
  }

  it("sponsor row with is_active=false shows 'Inactive' badge in the DOM", () => {
    const inactiveSponsor = makeSponsorWithStatus({
      id: "inactive-1",
      name: "Inactive Corp",
      is_active: false,
    });

    render(
      <SponsorList
        sponsors={[inactiveSponsor] as Sponsor[]}
        sponsorshipItems={sponsorshipItems}
      />
    );

    expect(
      screen.getByTestId(`inactive-badge-${inactiveSponsor.id}`)
    ).toBeInTheDocument();
  });

  it("sponsor row with is_active=true does NOT show 'Inactive' badge", () => {
    const activeSponsor = makeSponsorWithStatus({
      id: "active-1",
      name: "Active Corp",
      is_active: true,
    });

    render(
      <SponsorList
        sponsors={[activeSponsor] as Sponsor[]}
        sponsorshipItems={sponsorshipItems}
      />
    );

    expect(
      screen.queryByTestId(`inactive-badge-${activeSponsor.id}`)
    ).not.toBeInTheDocument();
  });
});
