/**
 * Sprint 19 — PR C RED tests: trash-tabs.tsx polish
 *
 * Tests:
 * 1. Each tab's table wrapper has overflow-x-auto (not absent/overflow-hidden)
 * 2. Count badges have text-[0.6875rem] class (was text-xs)
 * 3. Empty state uses AdminEmptyState (<h3> title) when a tab has zero rows
 *
 * Tests are RED: they describe PR C behaviour, failing against main at 846a6f4.
 *
 * Notes for Bolt:
 * - Tabs are: contacts, teams, sponsors, sponsorshipItems, photos.
 * - Each per-entity panel renders a <Table> or <EmptyState>.
 *   Wrap each <Table> in <div className="overflow-x-auto">.
 * - Badge span: change text-xs → text-[0.6875rem] on the count badge in the tab bar.
 * - Replace the local <EmptyState> (bare <p>) with <AdminEmptyState> from PR A.
 *   AdminEmptyState renders <h3 className="..."> for the title.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mock server actions (trash-tabs calls restore* actions)
// ---------------------------------------------------------------------------
vi.mock("@/app/admin/trash/actions", () => ({
  restoreContact: vi.fn(),
  restoreTeam: vi.fn(),
  restoreSponsor: vi.fn(),
  restoreSponsorshipItem: vi.fn(),
  restorePhoto: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { TrashTabs } from "@/app/admin/trash/trash-tabs";
import type { Contact, Team, Sponsor, SponsorshipItem, Photo } from "@/types/database";
import type { WithDeletedByName, TrashTeam } from "@/app/admin/trash/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContact(overrides: Partial<WithDeletedByName<Contact>> = {}): WithDeletedByName<Contact> {
  return {
    id: "c-1",
    full_name: "Jane Smith",
    first_name: "Jane",
    last_name: "Smith",
    salutation: null,
    email: null,
    phone: null,
    types: ["player"],
    company: null,
    address1: null,
    address2: null,
    city: null,
    state: null,
    zip: null,
    marketing_consent: false,
    source: null,
    year_first_seen: 2026,
    notes: null,
    handicap: null,
    shirt_size: null,
    show_on_wall: false,
    recognition_name: null,
    created_at: new Date().toISOString(),
    deleted_at: new Date().toISOString(),
    deleted_by: "admin-uuid",
    deleted_by_name: null,
    ...overrides,
  };
}

function makeTeam(overrides: Partial<TrashTeam> = {}): TrashTeam {
  return {
    id: "t-1",
    captain_display_name: "(unknown captain)",
    captain_contact_id: null,
    session: "morning",
    year: 2026,
    amount_paid_cents: 0,
    notes: null,
    payment_status: "pending",
    stripe_payment_id: null,
    created_at: new Date().toISOString(),
    deleted_at: new Date().toISOString(),
    deleted_by: "admin-uuid",
    deleted_by_name: null,
    ...overrides,
  };
}

function makeSponsor(overrides: Partial<WithDeletedByName<Sponsor>> = {}): WithDeletedByName<Sponsor> {
  return {
    id: "s-1",
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
    created_at: new Date().toISOString(),
    deleted_at: new Date().toISOString(),
    deleted_by: "admin-uuid",
    deleted_by_name: null,
    ...overrides,
  };
}

function makeSponsorshipItem(overrides: Partial<WithDeletedByName<SponsorshipItem>> = {}): WithDeletedByName<SponsorshipItem> {
  return {
    id: "si-1",
    name: "Gold Package",
    description: null,
    price_cents: 100000,
    max_quantity: null,
    sold_count: 0,
    active: true,
    benefits: [],
    sort_order: 1,
    year: 2026,
    created_at: new Date().toISOString(),
    deleted_at: new Date().toISOString(),
    deleted_by: "admin-uuid",
    deleted_by_name: null,
    ...overrides,
  };
}

function makePhoto(overrides: Partial<WithDeletedByName<Photo>> = {}): WithDeletedByName<Photo> {
  return {
    id: "p-1",
    image_url: "https://example.com/photo.jpg",
    caption: "A caption",
    status: "pending",
    uploaded_by_name: "John",
    uploaded_by_email: null,
    year: 2026,
    created_at: new Date().toISOString(),
    deleted_at: new Date().toISOString(),
    deleted_by: "admin-uuid",
    deleted_by_name: null,
    ...overrides,
  };
}

const EMPTY_PROPS = {
  contacts: [],
  teams: [],
  sponsors: [],
  sponsorshipItems: [],
  photos: [],
};

const TAB_LABELS = ["Contacts", "Teams", "Sponsors", "Sponsorship Items", "Photos"] as const;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TrashTabs — sprint-19 PR-C polish", () => {
  describe("table overflow-x-auto — per tab", () => {
    it("Contacts tab table wrapper has overflow-x-auto", () => {
      render(
        <TrashTabs
          {...EMPTY_PROPS}
          contacts={[makeContact()]}
        />
      );

      // Default tab is contacts; table should already be visible
      const table = document.querySelector("table");
      expect(table).toBeTruthy();

      const wrapper = table!.parentElement;
      // RED: current main has no overflow wrapper around tables in trash-tabs
      expect(wrapper!.className).toContain("overflow-x-auto");
    });

    it("Teams tab table wrapper has overflow-x-auto", () => {
      render(<TrashTabs {...EMPTY_PROPS} teams={[makeTeam()]} />);

      // Switch to Teams tab
      fireEvent.click(screen.getByRole("tab", { name: /^teams/i }));

      const table = document.querySelector("table");
      expect(table).toBeTruthy();
      const wrapper = table!.parentElement;
      expect(wrapper!.className).toContain("overflow-x-auto");
    });

    it("Sponsors tab table wrapper has overflow-x-auto", () => {
      render(<TrashTabs {...EMPTY_PROPS} sponsors={[makeSponsor()]} />);

      // The Sponsors tab button accessible name may include the count badge text.
      // We can't use /^sponsors$/i because the badge text appends digits.
      // We can't use /^sponsors/i because "Sponsorship Items" also starts with "Sponsors".
      // Use getAllByRole and pick the first match (Sponsors comes before Sponsorship Items).
      const sponsorButtons = screen.getAllByRole("tab", { name: /^sponsors/i });
      // First match is "Sponsors", second is "Sponsorship Items"
      fireEvent.click(sponsorButtons[0]);

      const table = document.querySelector("table");
      expect(table).toBeTruthy();
      const wrapper = table!.parentElement;
      expect(wrapper!.className).toContain("overflow-x-auto");
    });

    it("Sponsorship Items tab table wrapper has overflow-x-auto", () => {
      render(<TrashTabs {...EMPTY_PROPS} sponsorshipItems={[makeSponsorshipItem()]} />);

      fireEvent.click(screen.getByRole("tab", { name: /sponsorship items/i }));

      const table = document.querySelector("table");
      expect(table).toBeTruthy();
      const wrapper = table!.parentElement;
      expect(wrapper!.className).toContain("overflow-x-auto");
    });

    it("Photos tab table wrapper has overflow-x-auto", () => {
      render(<TrashTabs {...EMPTY_PROPS} photos={[makePhoto()]} />);

      fireEvent.click(screen.getByRole("tab", { name: /^photos/i }));

      const table = document.querySelector("table");
      expect(table).toBeTruthy();
      const wrapper = table!.parentElement;
      expect(wrapper!.className).toContain("overflow-x-auto");
    });
  });

  describe("count badge font size", () => {
    it("count badge has text-[0.6875rem] class (not text-xs)", () => {
      render(
        <TrashTabs
          {...EMPTY_PROPS}
          contacts={[makeContact(), makeContact({ id: "c-2" })]}
        />
      );

      // Find the badge for Contacts tab which shows count "2"
      const badges = document.querySelectorAll("span");
      const countBadge = Array.from(badges).find(
        (span) => span.textContent?.trim() === "2"
      );

      expect(countBadge).toBeTruthy();

      // RED: current main uses text-xs; PR C changes to text-[0.6875rem]
      expect(countBadge!.className).toContain("text-[0.6875rem]");
      // Must NOT use text-xs
      expect(countBadge!.className).not.toContain("text-xs");
    });
  });

  describe("empty state uses AdminEmptyState", () => {
    it("empty contacts tab renders an <h3> title (AdminEmptyState), not a bare <p>", () => {
      render(<TrashTabs {...EMPTY_PROPS} />);

      // Default tab is contacts; contacts array is empty → empty state
      // RED: current EmptyState renders <p>Trash is empty</p> — no <h3>
      // PR C: replace with AdminEmptyState which renders <h3>
      const h3Els = document.querySelectorAll("h3");
      const hasEmptyStateH3 = Array.from(h3Els).some((h3) =>
        h3.textContent?.match(/trash|empty|nothing/i)
      );

      expect(hasEmptyStateH3).toBe(true);
    });
  });
});
