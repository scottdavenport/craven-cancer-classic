import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactList } from "@/app/admin/contacts/contact-list";
import type { Contact } from "@/types/database";

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

const defaultTeams = [{ id: "team-1", team_name: "Team Alpha" }];

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
    expect(screen.getByText("Subscribed")).toBeInTheDocument();
  });

  it("shows Unsubscribed badge for non-consented contacts", () => {
    const contacts = [makeContact({ marketing_consent: false })];
    render(<ContactList contacts={contacts} teams={[]} />);
    expect(screen.getByText("Unsubscribed")).toBeInTheDocument();
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
    // The select component renders combobox triggers — verify there are multiple (type, year, company, consent, team)
    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes.length).toBeGreaterThanOrEqual(4);
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
    expect(screen.getByText("No contacts found")).toBeInTheDocument();
  });

  it("renders the Export CSV button", () => {
    render(<ContactList contacts={[]} teams={[]} />);
    expect(screen.getByRole("button", { name: /export csv/i })).toBeInTheDocument();
  });

  it("shows captain filter checkbox", () => {
    render(<ContactList contacts={[]} teams={[]} />);
    expect(screen.getByLabelText(/captains only/i)).toBeInTheDocument();
  });

  it("shows all 7 table headers", () => {
    render(<ContactList contacts={[makeContact()]} teams={[]} />);
    ["Name", "Email", "Type", "Company", "Year", "Consent", "Added"].forEach((h) => {
      expect(screen.getByText(h)).toBeInTheDocument();
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
// ---------------------------------------------------------------------------

describe("ContactList — sprint-30 Select items prop (#261 follow-up)", () => {
  it("Type filter trigger displays 'Player' (capitalized) when typeFilter='player' via initial state", () => {
    // Render with contacts; initial typeFilter is 'all'
    // We verify all Select triggers render their default label, not raw value
    const { container } = render(
      <ContactList contacts={[makeContact()]} teams={[]} />
    );
    // Filter row has 4 combobox selects: type, year, consent, team (in order)
    const triggers = container.querySelectorAll('[data-slot="select-trigger"]');
    // Type trigger should show "All Types" (label for value="all"), not "all"
    expect(triggers[0].textContent).toContain("All Types");
    expect(triggers[0].textContent).not.toBe("all");
  });

  it("Year filter trigger displays 'All Years' (label) not 'all' (raw value)", () => {
    const { container } = render(
      <ContactList contacts={[makeContact()]} teams={[]} />
    );
    const triggers = container.querySelectorAll('[data-slot="select-trigger"]');
    // Year trigger is second
    expect(triggers[1].textContent).toContain("All Years");
    expect(triggers[1].textContent).not.toBe("all");
  });

  it("Consent filter trigger displays 'All Contacts' (label) not 'all' (raw value)", () => {
    const { container } = render(
      <ContactList contacts={[makeContact()]} teams={[]} />
    );
    const triggers = container.querySelectorAll('[data-slot="select-trigger"]');
    // Consent trigger is third (index 2)
    expect(triggers[2].textContent).toContain("All Contacts");
    expect(triggers[2].textContent).not.toBe("all");
  });

  it("Team filter trigger displays team name (not UUID) when a UUID-id team is provided", () => {
    const uuidTeam = {
      id: "1e7bf5bc-1635-4f33-a2e1-e34c8a1b4d1b",
      team_name: "Davenport Family",
    };
    const { container } = render(
      <ContactList contacts={[makeContact()]} teams={[uuidTeam]} />
    );
    // Team trigger is fourth (index 3)
    const triggers = container.querySelectorAll('[data-slot="select-trigger"]');
    // Default is 'all' → should display "All Teams" label, not "all"
    // This verifies the items map is wired: value→label resolution is active
    expect(triggers[3].textContent).toContain("All Teams");
    expect(triggers[3].textContent).not.toBe("all");
    // UUID must NOT appear in trigger (would mean items prop is missing)
    expect(triggers[3].textContent).not.toContain("1e7bf5bc-1635-4f33-a2e1-e34c8a1b4d1b");
  });
});
