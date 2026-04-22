// RED: Trash table extraction + Deleted-By resolution — #236
// Fails until Bolt:
//   1. Extracts a generic <TrashTable<T>> component (issues 3)
//   2. Resolves deleted_by UUID to a human-readable name (issue 4)
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TrashTabs } from "@/app/admin/trash/trash-tabs";
import type { Contact, Team, Sponsor, SponsorshipItem, Photo } from "@/types/database";

// Mock server restore actions
vi.mock("@/app/admin/trash/actions", () => ({
  restoreContact: vi.fn().mockResolvedValue({ ok: true }),
  restoreTeam: vi.fn().mockResolvedValue({ ok: true }),
  restoreSponsor: vi.fn().mockResolvedValue({ ok: true }),
  restoreSponsorshipItem: vi.fn().mockResolvedValue({ ok: true }),
  restorePhoto: vi.fn().mockResolvedValue({ ok: true }),
}));

// Mock AdminEmptyState
vi.mock("@/components/admin/admin-empty-state", () => ({
  AdminEmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Seed data helpers
// ---------------------------------------------------------------------------

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "contact-1",
    full_name: "Alice Johnson",
    first_name: "Alice",
    last_name: "Johnson",
    email: "alice@example.com",
    phone: null,
    address1: null,
    address2: null,
    city: null,
    state: null,
    zip: null,
    company: null,
    salutation: null,
    type: "individual",
    notes: null,
    source: null,
    marketing_consent: false,
    year_first_seen: 2026,
    created_at: "2026-01-01T00:00:00.000Z",
    deleted_at: "2026-04-01T10:00:00.000Z",
    // deleted_by as a resolved name (Issue 4 — Option A)
    // Bolt should join profiles.full_name so this field contains a name, not UUID
    deleted_by: "admin-user-uuid",
    ...overrides,
  };
}

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: "team-1",
    team_name: "Eagle Squad",
    session: "morning",
    payment_status: "pending",
    amount_paid_cents: 0,
    captain_contact_id: null,
    notes: null,
    stripe_payment_id: null,
    year: 2026,
    created_at: "2026-01-01T00:00:00.000Z",
    deleted_at: "2026-04-01T10:00:00.000Z",
    deleted_by: "admin-user-uuid",
    ...overrides,
  };
}

function makeSponsor(overrides: Partial<Sponsor> = {}): Sponsor {
  return {
    id: "sponsor-1",
    name: "Acme Corp",
    tier_id: "tier-gold",
    website: null,
    logo_url: null,
    payment_status: "pending",
    amount_paid_cents: 0,
    stripe_payment_id: null,
    display_order: 1,
    is_active: true,
    year: 2026,
    created_at: "2026-01-01T00:00:00.000Z",
    deleted_at: "2026-04-01T10:00:00.000Z",
    deleted_by: "admin-user-uuid",
    ...overrides,
  };
}

function makeSponsorshipItem(overrides: Partial<SponsorshipItem> = {}): SponsorshipItem {
  return {
    id: "item-1",
    name: "Gold Sponsorship",
    price_cents: 500000,
    description: null,
    benefits: {},
    active: true,
    max_quantity: null,
    sold_count: 0,
    sort_order: 1,
    year: 2026,
    created_at: "2026-01-01T00:00:00.000Z",
    deleted_at: "2026-04-01T10:00:00.000Z",
    deleted_by: "admin-user-uuid",
    ...overrides,
  };
}

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    id: "photo-1",
    caption: "Hole 7 action shot",
    image_url: "https://example.com/photo.jpg",
    status: "approved",
    uploaded_by_name: "Bob",
    uploaded_by_email: null,
    year: 2026,
    created_at: "2026-01-01T00:00:00.000Z",
    deleted_at: "2026-04-01T10:00:00.000Z",
    deleted_by: "admin-user-uuid",
    ...overrides,
  };
}

const emptyProps = {
  contacts: [],
  teams: [],
  sponsors: [],
  sponsorshipItems: [],
  photos: [],
};

// ---------------------------------------------------------------------------
// Issue 3 — TrashTable component extraction
// ---------------------------------------------------------------------------

describe("TrashTabs — TrashTable component extraction (issue 3)", () => {
  it("Contacts tab renders a data-testid=trash-table element (generic TrashTable)", async () => {
    render(
      <TrashTabs
        {...emptyProps}
        contacts={[makeContact()]}
      />
    );
    // Contacts tab is active by default
    expect(screen.getByTestId("trash-table")).toBeInTheDocument();
  });

  it("Teams tab renders a TrashTable after switching tabs", async () => {
    render(
      <TrashTabs
        {...emptyProps}
        teams={[makeTeam()]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /teams/i }));
    expect(screen.getByTestId("trash-table")).toBeInTheDocument();
  });

  it("Sponsors tab renders a TrashTable after switching tabs", async () => {
    render(
      <TrashTabs
        {...emptyProps}
        sponsors={[makeSponsor()]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /^sponsors$/i }));
    expect(screen.getByTestId("trash-table")).toBeInTheDocument();
  });

  it("Sponsorship Items tab renders a TrashTable after switching tabs", async () => {
    render(
      <TrashTabs
        {...emptyProps}
        sponsorshipItems={[makeSponsorshipItem()]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /sponsorship items/i }));
    expect(screen.getByTestId("trash-table")).toBeInTheDocument();
  });

  it("Photos tab renders a TrashTable after switching tabs", async () => {
    render(
      <TrashTabs
        {...emptyProps}
        photos={[makePhoto()]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /photos/i }));
    expect(screen.getByTestId("trash-table")).toBeInTheDocument();
  });

  it("Contacts tab shows expected row data (no regression)", () => {
    render(
      <TrashTabs
        {...emptyProps}
        contacts={[makeContact({ full_name: "Alice Johnson" })]}
      />
    );
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
  });

  it("Teams tab shows expected row data (no regression)", () => {
    render(
      <TrashTabs
        {...emptyProps}
        teams={[makeTeam({ team_name: "Eagle Squad" })]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /teams/i }));
    expect(screen.getByText("Eagle Squad")).toBeInTheDocument();
  });

  it("Restore button appears for each row", () => {
    render(
      <TrashTabs
        {...emptyProps}
        contacts={[makeContact(), makeContact({ id: "contact-2", full_name: "Bob Lee" })]}
      />
    );
    const restoreButtons = screen.getAllByRole("button", { name: /restore/i });
    expect(restoreButtons).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Issue 4 — Deleted-By resolution (Option A: show name, not raw UUID)
// ---------------------------------------------------------------------------

describe("TrashTabs — Deleted-By column resolution (issue 4)", () => {
  it("Contacts tab Deleted By column shows human-readable name, not raw UUID", () => {
    // The server action must have joined profiles.full_name.
    // We simulate what that resolved data looks like by passing a contact
    // whose deleted_by has been resolved to a display name by the server action.
    // Bolt's implementation: deleted_by_name field OR resolved inline from profiles join.
    // Test: whatever text appears in the "Deleted By" column is NOT an 8-char UUID fragment.
    render(
      <TrashTabs
        {...emptyProps}
        contacts={[
          makeContact({
            // Simulate what Bolt's resolved data shape looks like.
            // deleted_by_name is the expected new field after Option A join.
            // We assert that the column does NOT show a truncated UUID.
            deleted_by: "admin-user-uuid",
          } as Parameters<typeof makeContact>[0] & { deleted_by_name?: string }),
        ]}
      />
    );

    // The column must NOT show a truncated UUID (8-char hex pattern like "admin-us")
    // Instead it should show a full name or fallback text
    const rows = screen.getAllByRole("row");
    const dataRow = rows[1]; // skip header
    const deletedByCell = dataRow.querySelectorAll("td")[2]; // 3rd column = Deleted By

    // Must not be rendering a raw truncated UUID
    // A truncated UUID looks like "admin-us…" or "xxxxxxxx…" (8 hex chars + ellipsis)
    expect(deletedByCell.textContent).not.toMatch(/^[0-9a-f]{8}[…]/i);
    // Must NOT have font-mono class (raw UUID display pattern)
    expect(deletedByCell.className).not.toContain("font-mono");
  });

  it("Contacts tab Deleted By shows readable fallback when name unavailable", () => {
    render(
      <TrashTabs
        {...emptyProps}
        contacts={[makeContact({ deleted_by: null })]}
      />
    );
    // When deleted_by is null, show something meaningful like "Unknown" or "—"
    const rows = screen.getAllByRole("row");
    const dataRow = rows[1];
    const deletedByCell = dataRow.querySelectorAll("td")[2];
    expect(deletedByCell.textContent).toMatch(/unknown|—/i);
  });
});
