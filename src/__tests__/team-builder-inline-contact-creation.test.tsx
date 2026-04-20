/**
 * S11-3 RED phase — Inline contact creation in team builder
 *
 * When the admin types a search query into the captain or player picker and
 * searchContacts returns an empty array, a "+ Create '...' as a new contact"
 * CTA must appear. Clicking it opens a nested inline mini-form that:
 *   - Pre-populates name fields from the search query
 *   - On submit calls createContact and auto-selects the new contact into the slot
 *   - On cancel closes without creating anything
 *
 * These tests FAIL until Bolt implements the feature in team-form.tsx.
 *
 * Architecture note for Bolt:
 *   - ContactTypeahead lives in src/app/admin/teams/team-form.tsx (not a separate file)
 *   - searchContacts is from ./actions (teams/actions.ts)
 *   - createContact is from @/app/admin/contacts/actions
 *   - The inline form should NOT use window.prompt / window.confirm / window.alert
 *   - ContactTypeahead currently only opens the dropdown when results.length > 0
 *     (line: `setOpen(filtered.length > 0)`) — the CTA must appear even when length === 0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Hoist mocks — must be before any imports that pull in these modules
// ---------------------------------------------------------------------------

vi.mock("@/app/admin/teams/actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/admin/teams/actions")>();
  return {
    ...actual,
    searchContacts: vi.fn(),
    createTeam: vi.fn().mockResolvedValue({ id: "new-team-id" }),
    updateTeamMembers: vi.fn().mockResolvedValue({ ok: true }),
  };
});

vi.mock("@/app/admin/contacts/actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/admin/contacts/actions")>();
  return {
    ...actual,
    createContact: vi.fn(),
  };
});

// Stub lucide-react — use importOriginal so Select/other shadcn components that
// pull named icons (ChevronDownIcon, etc.) still resolve.
vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("lucide-react")>();
  return {
    ...actual,
    X: () => null,
    Plus: () => null,
  };
});

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { TeamForm } from "@/app/admin/teams/team-form";
import * as teamsActions from "@/app/admin/teams/actions";
import * as contactsActions from "@/app/admin/contacts/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOnSuccess() {
  return vi.fn();
}

function makeOnCancel() {
  return vi.fn();
}

/** Render a fresh-team TeamForm (no existing team). */
function renderNewTeamForm() {
  const onSuccess = makeOnSuccess();
  const onCancel = makeOnCancel();
  render(<TeamForm team={null} onSuccess={onSuccess} onCancel={onCancel} />);
  return { onSuccess, onCancel };
}

/**
 * The ContactTypeahead inputs all share the same placeholder text.
 * They appear in DOM order: captain (0), player2 (1), player3 (2), player4 (3).
 * This helper gets the Nth search input and types a query into it.
 */
const SLOT_INDEX: Record<string, number> = {
  captain: 0,
  player2: 1,
  player3: 2,
  player4: 3,
};

async function typeQueryAndWaitForSearch(
  user: ReturnType<typeof userEvent.setup>,
  slot: "captain" | "player2" | "player3" | "player4",
  query: string
) {
  const inputs = screen.getAllByPlaceholderText(/search by name or email/i);
  const input = inputs[SLOT_INDEX[slot]];
  await user.click(input);
  await user.type(input, query);
  // Advance past the 200ms debounce
  await vi.advanceTimersByTimeAsync(250);
  return input;
}

/**
 * Returns the Nth search input (captain=0, etc.) — used in assertions that
 * verify the input is still present after cancel (no active chip).
 */
function getSearchInput(slot: "captain" | "player2" | "player3" | "player4") {
  const inputs = screen.getAllByPlaceholderText(/search by name or email/i);
  return inputs[SLOT_INDEX[slot]];
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  // Default: searchContacts resolves with empty results
  vi.mocked(teamsActions.searchContacts).mockResolvedValue([]);
  // Default: createContact resolves to a new contact
  vi.mocked(contactsActions.createContact).mockResolvedValue({
    id: "new-contact-uuid",
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Empty-search-state CTA visibility
// ---------------------------------------------------------------------------

describe("ContactTypeahead — empty-search CTA", () => {
  describe("captain slot", () => {
    it("shows '+ Create' CTA when searchContacts returns empty array", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderNewTeamForm();

      await typeQueryAndWaitForSearch(user, "captain", "Jane Smith");

      await waitFor(() => {
        // The CTA must appear anywhere in the results area
        expect(
          screen.getByRole("button", { name: /create.*jane smith/i })
        ).toBeInTheDocument();
      });
    });

    it("includes the typed query in the CTA label", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderNewTeamForm();

      await typeQueryAndWaitForSearch(user, "captain", "Bob Tester");

      await waitFor(() => {
        const cta = screen.getByRole("button", { name: /create.*bob tester/i });
        expect(cta).toBeInTheDocument();
      });
    });

    it("does NOT show CTA when searchContacts returns results", async () => {
      vi.mocked(teamsActions.searchContacts).mockResolvedValue([
        { id: "existing-1", full_name: "Jane Smith", email: "jane@example.com", company: null },
      ]);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderNewTeamForm();

      await typeQueryAndWaitForSearch(user, "captain", "Jane Smith");

      await waitFor(() => {
        expect(screen.queryByRole("button", { name: /create.*jane smith/i })).not.toBeInTheDocument();
      });
    });
  });

  describe("player slot", () => {
    it("shows '+ Create' CTA for player 2 slot when search returns empty", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderNewTeamForm();

      await typeQueryAndWaitForSearch(user, "player2", "New Player");

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create.*new player/i })
        ).toBeInTheDocument();
      });
    });
  });
});

// ---------------------------------------------------------------------------
// 2. CTA click opens inline form
// ---------------------------------------------------------------------------

describe("ContactTypeahead — inline form opens on CTA click", () => {
  it("renders an inline contact form when CTA is clicked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderNewTeamForm();

    await typeQueryAndWaitForSearch(user, "captain", "Jane Smith");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create.*jane smith/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /create.*jane smith/i }));

    // An inline form must appear — look for name fields
    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    });
  });

  it("pre-populates first name from the typed query when query is a single word", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderNewTeamForm();

    await typeQueryAndWaitForSearch(user, "captain", "Jane");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /create.*jane/i })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /create.*jane/i }));

    await waitFor(() => {
      const firstNameInput = screen.getByLabelText(/first name/i);
      expect(firstNameInput).toHaveValue("Jane");
    });
  });

  it("pre-populates first name and last name from a two-word query", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderNewTeamForm();

    await typeQueryAndWaitForSearch(user, "captain", "Jane Smith");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /create.*jane smith/i })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /create.*jane smith/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toHaveValue("Jane");
      expect(screen.getByLabelText(/last name/i)).toHaveValue("Smith");
    });
  });

  it("does NOT use window.prompt or window.confirm — no native browser UI", async () => {
    const promptSpy = vi.spyOn(window, "prompt");
    const confirmSpy = vi.spyOn(window, "confirm");
    const alertSpy = vi.spyOn(window, "alert");

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderNewTeamForm();

    await typeQueryAndWaitForSearch(user, "captain", "Jane Smith");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /create.*jane smith/i })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /create.*jane smith/i }));

    await vi.advanceTimersByTimeAsync(100);

    expect(promptSpy).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3. Submit creates contact + auto-selects into slot
// ---------------------------------------------------------------------------

describe("ContactTypeahead — submit inline form creates contact and auto-selects", () => {
  it("calls createContact with form values on submit", async () => {
    vi.mocked(contactsActions.createContact).mockResolvedValue({ id: "created-contact-id" });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderNewTeamForm();

    // Open inline form via CTA
    await typeQueryAndWaitForSearch(user, "captain", "Jane Smith");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /create.*jane smith/i })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /create.*jane smith/i }));

    await waitFor(() => screen.getByLabelText(/first name/i));

    // Fill in email so the contact form passes validation
    const emailInput = screen.getByLabelText(/email/i);
    await user.clear(emailInput);
    await user.type(emailInput, "jane@example.com");

    // Submit the inline form
    const saveButton = screen.getByRole("button", { name: /save|create contact/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(contactsActions.createContact).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: "Jane",
          last_name: "Smith",
        })
      );
    });
  });

  it("auto-selects the new contact into the captain slot after successful create", async () => {
    vi.mocked(contactsActions.createContact).mockResolvedValue({ id: "created-captain-id" });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderNewTeamForm();

    await typeQueryAndWaitForSearch(user, "captain", "Jane Smith");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /create.*jane smith/i })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /create.*jane smith/i }));

    await waitFor(() => screen.getByLabelText(/first name/i));

    const emailInput = screen.getByLabelText(/email/i);
    await user.clear(emailInput);
    await user.type(emailInput, "jane@example.com");

    const saveButton = screen.getByRole("button", { name: /save|create contact/i });
    await user.click(saveButton);

    // After create success, the captain slot should show the new contact's name as a selected chip
    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    // The inline form should be gone
    await waitFor(() => {
      expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument();
    });
  });

  it("closes the inline form after successful submit", async () => {
    vi.mocked(contactsActions.createContact).mockResolvedValue({ id: "new-id" });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderNewTeamForm();

    await typeQueryAndWaitForSearch(user, "captain", "Jane Smith");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /create.*jane smith/i })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /create.*jane smith/i }));
    await waitFor(() => screen.getByLabelText(/first name/i));

    const emailInput = screen.getByLabelText(/email/i);
    await user.clear(emailInput);
    await user.type(emailInput, "jane@example.com");

    await user.click(screen.getByRole("button", { name: /save|create contact/i }));

    await waitFor(() => {
      expect(screen.queryByLabelText(/last name/i)).not.toBeInTheDocument();
    });
  });

  it("does NOT call createContact if submission has validation errors", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderNewTeamForm();

    await typeQueryAndWaitForSearch(user, "captain", "");
    // If query is blank, the CTA should not appear (nothing to create)
    await vi.advanceTimersByTimeAsync(300);

    expect(contactsActions.createContact).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 4. Cancel discards without creating
// ---------------------------------------------------------------------------

describe("ContactTypeahead — cancel inline form", () => {
  it("closes the inline form when cancel is clicked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderNewTeamForm();

    await typeQueryAndWaitForSearch(user, "captain", "Jane Smith");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /create.*jane smith/i })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /create.*jane smith/i }));
    await waitFor(() => screen.getByLabelText(/first name/i));

    // Click the cancel button inside the inline form
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument();
    });
  });

  it("does NOT call createContact when cancel is clicked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderNewTeamForm();

    await typeQueryAndWaitForSearch(user, "captain", "Jane Smith");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /create.*jane smith/i })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /create.*jane smith/i }));
    await waitFor(() => screen.getByLabelText(/first name/i));

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(contactsActions.createContact).not.toHaveBeenCalled();
  });

  it("leaves the captain slot unselected after cancel", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderNewTeamForm();

    await typeQueryAndWaitForSearch(user, "captain", "Jane Smith");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /create.*jane smith/i })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /create.*jane smith/i }));
    await waitFor(() => screen.getByLabelText(/first name/i));

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    // The captain chip should NOT appear — no contact was selected
    await waitFor(() => {
      expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
    });
  });

  it("returns picker to search state after cancel (search input visible again)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderNewTeamForm();

    await typeQueryAndWaitForSearch(user, "captain", "Jane Smith");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /create.*jane smith/i })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /create.*jane smith/i }));
    await waitFor(() => screen.getByLabelText(/first name/i));

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    // The search input for captain should be accessible again
    await waitFor(() => {
      expect(getSearchInput("captain")).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// 5. Works in captain AND player slot contexts
// ---------------------------------------------------------------------------

describe("ContactTypeahead — works in both captain and player slots", () => {
  it("auto-selects created contact into captain slot (not player slots)", async () => {
    vi.mocked(contactsActions.createContact).mockResolvedValue({
      id: "captain-id",
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderNewTeamForm();

    // Create contact via captain picker
    await typeQueryAndWaitForSearch(user, "captain", "Captain Kirk");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /create.*captain kirk/i })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /create.*captain kirk/i }));
    await waitFor(() => screen.getByLabelText(/first name/i));

    const emailInput = screen.getByLabelText(/email/i);
    await user.clear(emailInput);
    await user.type(emailInput, "kirk@example.com");

    await user.click(screen.getByRole("button", { name: /save|create contact/i }));

    // Captain chip shows the name; no player chip for the same name
    await waitFor(() => {
      expect(screen.getByText("Captain Kirk")).toBeInTheDocument();
    });

    // The player 2 slot should still show the search input (not a chip for Kirk)
    await waitFor(() => {
      expect(getSearchInput("player2")).toBeInTheDocument();
    });
  });

  it("auto-selects created contact into player 2 slot (not captain or other player slots)", async () => {
    vi.mocked(contactsActions.createContact).mockResolvedValue({
      id: "player2-id",
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderNewTeamForm();

    // Create contact via Player 2 picker
    await typeQueryAndWaitForSearch(user, "player2", "Player Two");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /create.*player two/i })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /create.*player two/i }));
    await waitFor(() => screen.getByLabelText(/first name/i));

    const emailInput = screen.getByLabelText(/email/i);
    await user.clear(emailInput);
    await user.type(emailInput, "player2@example.com");

    await user.click(screen.getByRole("button", { name: /save|create contact/i }));

    // Player 2 chip shows the name
    await waitFor(() => {
      expect(screen.getByText("Player Two")).toBeInTheDocument();
    });

    // Captain slot should still be an empty search input
    await waitFor(() => {
      expect(getSearchInput("captain")).toBeInTheDocument();
    });
  });

  it("shows CTA in player 3 slot when search returns empty", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderNewTeamForm();

    await typeQueryAndWaitForSearch(user, "player3", "Third Player");

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /create.*third player/i })
      ).toBeInTheDocument();
    });
  });

  it("shows CTA in player 4 slot when search returns empty", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderNewTeamForm();

    await typeQueryAndWaitForSearch(user, "player4", "Fourth Player");

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /create.*fourth player/i })
      ).toBeInTheDocument();
    });
  });
});
