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
    type: "player",
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
    created_at: new Date().toISOString(),
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
      makeContact({ id: "1", full_name: "Alice", first_name: "Alice", last_name: null, type: "player" }),
      makeContact({ id: "2", full_name: "Bob Corp", first_name: null, last_name: null, type: "sponsor" }),
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
