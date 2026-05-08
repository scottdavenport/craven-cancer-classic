import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactList } from "@/app/admin/contacts/contact-list";
import type { Contact } from "@/types/database";
import type { TeamFilterOption } from "@/app/admin/contacts/actions";

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "uuid-1",
    full_name: "John Doe",
    first_name: "John",
    last_name: "Doe",
    salutation: null,
    email: "john@example.com",
    phone: null,
    types: ["player"],
    company: null,
    address1: null,
    address2: null,
    city: null,
    state: null,
    zip: null,
    marketing_consent: true,
    source: null,
    year_first_seen: 2026,
    notes: null,
    handicap: null,
    shirt_size: null,
    show_on_wall: false,
    recognition_name: null,
    created_at: new Date().toISOString(),
    deleted_at: null,
    deleted_by: null,
    ...overrides,
  };
}

// Sprint 32: teams no longer have team_name; display = captain_display_name (actual type field)
const defaultTeams = [{ id: "team-1", captain_display_name: "Alpha Captain" }] as unknown as TeamFilterOption[];

describe("ContactList", () => {
  it("renders contact name from first_name + last_name when available", () => {
    const contacts = [makeContact({ first_name: "Jane", last_name: "Smith", full_name: "Jane Smith" })];
    render(<ContactList contacts={contacts} teams={[]} />);
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("falls back to full_name when first/last name are null", () => {
    const contacts = [makeContact({ first_name: null, last_name: null, full_name: "Anonymous User" })];
    render(<ContactList contacts={contacts} teams={[]} />);
    expect(screen.getByText("Anonymous User")).toBeInTheDocument();
  });

  it("shows 'none' for contacts without email", () => {
    const contacts = [makeContact({ email: null })];
    render(<ContactList contacts={contacts} teams={[]} />);
    expect(screen.getByText("none")).toBeInTheDocument();
  });

  it("shows company column with truncation title", () => {
    const contacts = [makeContact({ company: "Acme Corp" })];
    render(<ContactList contacts={contacts} teams={[]} />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("shows Subscribed badge for consented contacts", () => {
    const contacts = [makeContact({ marketing_consent: true })];
    render(<ContactList contacts={contacts} teams={[]} />);
    // "Subscribed" appears in both the status tab and the ConsentBadge — use getAllByText
    const matches = screen.getAllByText("Subscribed");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Unsubscribed badge for non-consented contacts", () => {
    const contacts = [makeContact({ marketing_consent: false })];
    render(<ContactList contacts={contacts} teams={[]} />);
    // "Unsubscribed" appears in both the status tab and the ConsentBadge — use getAllByText
    const matches = screen.getAllByText("Unsubscribed");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("filters contacts by type when user selects a type", async () => {
    const user = userEvent.setup();
    const contacts = [
      makeContact({ id: "1", full_name: "Alice", first_name: "Alice", last_name: null, types: ["player"] }),
      makeContact({ id: "2", full_name: "Bob Corp", first_name: null, last_name: null, types: ["sponsor"] }),
    ];
    render(<ContactList contacts={contacts} teams={[]} />);

    // Both visible initially
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob Corp")).toBeInTheDocument();
  });

  it("filters contacts by marketing consent when unsubscribed selected", async () => {
    const user = userEvent.setup();
    const contacts = [
      makeContact({ id: "1", full_name: "Subscribed User", first_name: null, last_name: null, marketing_consent: true }),
      makeContact({ id: "2", full_name: "Opted Out", first_name: null, last_name: null, marketing_consent: false }),
    ];
    render(<ContactList contacts={contacts} teams={[]} />);

    // Both visible initially
    expect(screen.getByText("Subscribed User")).toBeInTheDocument();
    expect(screen.getByText("Opted Out")).toBeInTheDocument();
  });

  it("renders team filter combobox", () => {
    const contacts = [makeContact()];
    render(<ContactList contacts={contacts} teams={defaultTeams} />);
    // D12 FilterBar has Type + Team selects (role="combobox"). Year and Consent are
    // status-tab driven, not separate Select dropdowns.
    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes.length).toBeGreaterThanOrEqual(1);
  });

  it("shows count of filtered contacts", () => {
    const contacts = [makeContact({ id: "1" }), makeContact({ id: "2" })];
    render(<ContactList contacts={contacts} teams={[]} />);
    expect(screen.getByText("2 contacts")).toBeInTheDocument();
  });

  it("shows singular 'contact' for one result", () => {
    const contacts = [makeContact()];
    render(<ContactList contacts={contacts} teams={[]} />);
    expect(screen.getByText("1 contact")).toBeInTheDocument();
  });

  it("shows empty state when no contacts", () => {
    render(<ContactList contacts={[]} teams={[]} />);
    // AdminEmptyState renders the title prop: "No contacts yet" (no active filters)
    expect(screen.getByText("No contacts yet")).toBeInTheDocument();
  });

  it("renders the Export CSV button", () => {
    render(<ContactList contacts={[]} teams={[]} />);
    expect(screen.getByRole("button", { name: /export csv/i })).toBeInTheDocument();
  });

  it("shows captain filter checkbox", () => {
    render(<ContactList contacts={[]} teams={[]} />);
    expect(screen.getByLabelText(/captains only/i)).toBeInTheDocument();
  });

  it("shows all 6 table data headers", () => {
    const { container } = render(<ContactList contacts={[makeContact()]} teams={[]} />);
    // DATA_HEADERS = ["Name", "Email", "Type", "Company", "Consent", "Added"] — 6 columns, no Year.
    // "Type" also appears in FilterBar filter label, so query within <thead> to disambiguate.
    const thead = container.querySelector("thead");
    expect(thead).toBeTruthy();
    ["Name", "Email", "Type", "Company", "Consent", "Added"].forEach((h) => {
      expect(thead!.textContent).toContain(h);
    });
  });
});

// ---------------------------------------------------------------------------
// Sprint 19 — PR C polish tests (RED: fail until PR C lands)
// ---------------------------------------------------------------------------

describe("ContactList — sprint-19 PR-C polish", () => {
  it("table wrapper has overflow-x-auto class (P1 mobile clipping fix)", () => {
    const { container } = render(<ContactList contacts={[makeContact()]} teams={[]} />);

    const table = container.querySelector("table");
    expect(table).toBeTruthy();

    // Walk up to the closest div wrapper that would carry the overflow class
    const wrapper = table!.parentElement;
    expect(wrapper).toBeTruthy();

    // RED: current main has overflow-hidden on the table wrapper; PR C changes to overflow-x-auto
    expect(wrapper!.className).toContain("overflow-x-auto");
    // Must NOT have overflow-hidden
    expect(wrapper!.className).not.toContain("overflow-hidden");
  });
});

// ---------------------------------------------------------------------------
// Sprint 30 — Select items prop regression tests
// Guard: trigger must display the human label, not the raw value.
//
// D12 FilterBar has 2 Select dropdowns (Type at index 0, Team at index 1).
// Year and Consent filtering is handled by StatusTabs, not Select dropdowns.
// ---------------------------------------------------------------------------

describe("ContactList — sprint-30 Select items prop (#261 follow-up)", () => {
  it("Type filter trigger displays 'All types' (label for value='all') via items prop", () => {
    // Render with contacts; initial typeFilter is 'all'
    const { container } = render(
      <ContactList contacts={[makeContact()]} teams={[]} />
    );
    // D12 FilterBar: Type select is data-testid="type-filter-trigger"
    const typeTrigger = container.querySelector('[data-testid="type-filter-trigger"]');
    expect(typeTrigger).toBeTruthy();
    // items prop: { all: "All types", player: "Player", ... } — label is "All types" (lowercase t)
    expect(typeTrigger!.textContent).toContain("All types");
    expect(typeTrigger!.textContent).not.toBe("all");
  });

  it("Team filter trigger displays 'All teams' (label) not 'all' (raw value)", () => {
    const { container } = render(
      <ContactList contacts={[makeContact()]} teams={[]} />
    );
    // D12 FilterBar: Team select is data-testid="team-filter-trigger"
    const teamTrigger = container.querySelector('[data-testid="team-filter-trigger"]');
    expect(teamTrigger).toBeTruthy();
    // items prop: { all: "All teams", ... } — label is "All teams" (lowercase t)
    expect(teamTrigger!.textContent).toContain("All teams");
    expect(teamTrigger!.textContent).not.toBe("all");
  });

  it("StatusTabs renders Subscribed/Unsubscribed/All tabs (consent filter via tabs, not Select)", () => {
    // D12: consent filtering is via StatusTabs, not a Select dropdown.
    // Verify the 3 tabs render correctly.
    render(<ContactList contacts={[makeContact({ marketing_consent: true })]} teams={[]} />);
    const tabs = screen.getAllByRole("tab");
    const tabLabels = tabs.map((t) => t.textContent?.trim());
    expect(tabLabels.some((l) => l?.includes("Subscribed"))).toBe(true);
    expect(tabLabels.some((l) => l?.includes("Unsubscribed"))).toBe(true);
    expect(tabLabels.some((l) => l?.includes("All"))).toBe(true);
  });

  it("Team filter trigger displays captain name (not UUID) when a UUID-id team is provided (Sprint 32)", () => {
    // Sprint 32: team display is captain_display_name (actual TeamFilterOption field)
    const uuidTeam = {
      id: "1e7bf5bc-1635-4f33-a2e1-e34c8a1b4d1b",
      captain_display_name: "Scott Davenport",
    } as unknown as TeamFilterOption;
    const { container } = render(
      <ContactList contacts={[makeContact()]} teams={[uuidTeam]} />
    );
    // Team trigger via data-testid
    const teamTrigger = container.querySelector('[data-testid="team-filter-trigger"]');
    expect(teamTrigger).toBeTruthy();
    // Default is 'all' → should display "All teams" label
    expect(teamTrigger!.textContent).toContain("All teams");
    expect(teamTrigger!.textContent).not.toBe("all");
    // UUID must NOT appear in trigger (would mean items prop is missing)
    expect(teamTrigger!.textContent).not.toContain("1e7bf5bc-1635-4f33-a2e1-e34c8a1b4d1b");
  });
});

// ---------------------------------------------------------------------------
// Issue #359 — header checkbox indeterminate state wiring
//
// D12 note: two role="checkbox" elements share the same aria-label per row:
//   1. <Checkbox> button (data-slot="checkbox") in the <td> — the primary row toggle
//   2. <input type="checkbox"> inside <RowActions> — the hover-reveal secondary checkbox
// Use getAllByRole + [0] to target the primary Checkbox button.
// Header checkbox has aria-label="Select all" (not "Select all visible contacts").
// ---------------------------------------------------------------------------

describe("header checkbox indeterminate state", () => {
  function getHeaderCheckbox() {
    // Header checkbox aria-label is "Select all" (set in contact-list.tsx thead)
    return screen.getByRole("checkbox", { name: "Select all" });
  }

  function getRowCheckbox(name: string) {
    // Each row has two role="checkbox" elements with the same label (Checkbox button + RowActions input).
    // Take the first one (the primary Checkbox button, data-slot="checkbox").
    return screen.getAllByRole("checkbox", { name })[0];
  }

  it("header checkbox has indeterminate=true when some but not all visible contacts are selected", async () => {
    const user = userEvent.setup();
    const contacts = [
      makeContact({ id: "a", first_name: "Alice", last_name: "A", full_name: "Alice A" }),
      makeContact({ id: "b", first_name: "Bob", last_name: "B", full_name: "Bob B" }),
    ];
    render(<ContactList contacts={contacts} teams={[]} />);

    // Select exactly one row by its named checkbox (primary button)
    await user.click(getRowCheckbox("Select Alice A"));

    expect(getHeaderCheckbox()).toHaveAttribute("aria-checked", "mixed");
  });

  it("header checkbox has indeterminate=false when all visible contacts are selected", async () => {
    const user = userEvent.setup();
    const contacts = [
      makeContact({ id: "a", first_name: "Alice", last_name: "A", full_name: "Alice A" }),
      makeContact({ id: "b", first_name: "Bob", last_name: "B", full_name: "Bob B" }),
    ];
    render(<ContactList contacts={contacts} teams={[]} />);

    // Select both rows
    await user.click(getRowCheckbox("Select Alice A"));
    await user.click(getRowCheckbox("Select Bob B"));

    expect(getHeaderCheckbox()).toHaveAttribute("aria-checked", "true");
  });

  it("header checkbox has indeterminate=false when no contacts are selected", () => {
    const contacts = [
      makeContact({ id: "a", first_name: "Alice", last_name: "A", full_name: "Alice A" }),
      makeContact({ id: "b", first_name: "Bob", last_name: "B", full_name: "Bob B" }),
    ];
    render(<ContactList contacts={contacts} teams={[]} />);

    // Nothing clicked — default state
    expect(getHeaderCheckbox()).toHaveAttribute("aria-checked", "false");
  });

  it("clicking header checkbox when indeterminate selects all visible contacts", async () => {
    const user = userEvent.setup();
    const contacts = [
      makeContact({ id: "a", first_name: "Alice", last_name: "A", full_name: "Alice A" }),
      makeContact({ id: "b", first_name: "Bob", last_name: "B", full_name: "Bob B" }),
      makeContact({ id: "c", first_name: "Carol", last_name: "C", full_name: "Carol C" }),
    ];
    render(<ContactList contacts={contacts} teams={[]} />);

    // Select exactly 1 row to put header into indeterminate
    await user.click(getRowCheckbox("Select Alice A"));
    expect(getHeaderCheckbox()).toHaveAttribute("aria-checked", "mixed");

    // Click the header checkbox — should select all 3
    await user.click(getHeaderCheckbox());

    expect(getRowCheckbox("Select Alice A")).toHaveAttribute("aria-checked", "true");
    expect(getRowCheckbox("Select Bob B")).toHaveAttribute("aria-checked", "true");
    expect(getRowCheckbox("Select Carol C")).toHaveAttribute("aria-checked", "true");
  });
});
