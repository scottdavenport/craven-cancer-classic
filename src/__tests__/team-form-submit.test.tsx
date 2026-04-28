/**
 * #170 — TeamForm submit path coverage
 *
 * Tests the create and edit submit paths, validation gates, and isEdit render
 * branch in TeamForm (src/app/admin/teams/team-form.tsx).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Hoist mocks
// ---------------------------------------------------------------------------

vi.mock("@/app/admin/teams/actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/admin/teams/actions")>();
  return {
    ...actual,
    searchContacts: vi.fn().mockResolvedValue([]),
    createTeam: vi.fn(),
    updateTeamMembers: vi.fn(),
  };
});

vi.mock("@/app/admin/contacts/actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/admin/contacts/actions")>();
  return {
    ...actual,
    createContact: vi.fn(),
  };
});

vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("lucide-react")>();
  return { ...actual, X: () => null };
});

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { TeamForm } from "@/app/admin/teams/team-form";
import * as teamsActions from "@/app/admin/teams/actions";
import type { TeamWithMembers } from "@/app/admin/teams/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContact(id: string, name: string) {
  return { id, full_name: name, email: `${id}@example.com`, company: null };
}

function makeTeam(overrides: Partial<TeamWithMembers> = {}): TeamWithMembers {
  return {
    id: "team-abc",
    team_name: "The Birdies",
    year: 2026,
    captain_contact_id: "contact-captain",
    payment_status: "pending",
    amount_paid_cents: 0,
    session: "morning",
    members: [
      { contact_id: "contact-captain", full_name: "Captain Jane", role: "captain", slot: 1 },
    ],
    member_count: 1,
    open_slots: 3,
    ...overrides,
  };
}

/** Render new-team form (team = null). */
function renderNew() {
  const onSuccess = vi.fn();
  const onCancel = vi.fn();
  render(<TeamForm team={null} onSuccess={onSuccess} onCancel={onCancel} />);
  return { onSuccess, onCancel };
}

/** Render edit form with a pre-built team. */
function renderEdit(team: TeamWithMembers) {
  const onSuccess = vi.fn();
  const onCancel = vi.fn();
  render(<TeamForm team={team} onSuccess={onSuccess} onCancel={onCancel} />);
  return { onSuccess, onCancel };
}

/**
 * Select a contact into the captain slot by injecting a search result and
 * clicking the dropdown item. Returns after the chip appears.
 */
async function selectCaptain(
  user: ReturnType<typeof userEvent.setup>,
  contact: { id: string; full_name: string; email: string | null; company: string | null }
) {
  vi.mocked(teamsActions.searchContacts).mockResolvedValue([contact]);

  const captainInputs = screen.getAllByPlaceholderText(/search by name or email/i);
  const captainInput = captainInputs[0];
  await user.click(captainInput);
  await user.type(captainInput, contact.full_name.split(" ")[0]);
  await vi.advanceTimersByTimeAsync(250);

  await waitFor(() => {
    expect(screen.getByRole("button", { name: contact.full_name })).toBeInTheDocument();
  });

  await user.click(screen.getByRole("button", { name: contact.full_name }));

  await waitFor(() => {
    expect(screen.getByText(contact.full_name)).toBeInTheDocument();
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.mocked(teamsActions.searchContacts).mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Create path — captain + full roster
// ---------------------------------------------------------------------------

describe("TeamForm — create path", () => {
  it("calls createTeam with correct payload when captain and players are set", async () => {
    vi.mocked(teamsActions.createTeam).mockResolvedValue({ team_id: "new-team-id" });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { onSuccess } = renderNew();

    // Fill team name
    const nameInput = screen.getByLabelText(/team name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "The Birdies");

    // Select captain
    await selectCaptain(user, makeContact("cap-1", "Captain Jack"));

    // Submit
    await user.click(screen.getByRole("button", { name: /save team/i }));

    await waitFor(() => {
      expect(teamsActions.createTeam).toHaveBeenCalledWith(
        expect.objectContaining({
          team_name: "The Birdies",
          captain_contact_id: "cap-1",
        })
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("calls createTeam with empty player_contact_ids when only captain is set", async () => {
    vi.mocked(teamsActions.createTeam).mockResolvedValue({ team_id: "new-team-id" });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { onSuccess } = renderNew();

    const nameInput = screen.getByLabelText(/team name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Solo Team");

    await selectCaptain(user, makeContact("cap-2", "Lone Ranger"));

    await user.click(screen.getByRole("button", { name: /save team/i }));

    await waitFor(() => {
      expect(teamsActions.createTeam).toHaveBeenCalledWith(
        expect.objectContaining({
          team_name: "Solo Team",
          captain_contact_id: "cap-2",
          player_contact_ids: [],
        })
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("renders error message and does NOT call createTeam when createTeam returns error", async () => {
    vi.mocked(teamsActions.createTeam).mockResolvedValue({ error: "RPC failed" });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { onSuccess } = renderNew();

    const nameInput = screen.getByLabelText(/team name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Error Team");

    await selectCaptain(user, makeContact("cap-3", "Error Captain"));

    await user.click(screen.getByRole("button", { name: /save team/i }));

    await waitFor(() => {
      expect(screen.getByText("RPC failed")).toBeInTheDocument();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 2. Validation errors
// ---------------------------------------------------------------------------

describe("TeamForm — validation", () => {
  it("shows error and does NOT call createTeam when team name is empty", async () => {
    renderNew();

    // Ensure team name input is blank
    const nameInput = screen.getByLabelText(/team name/i);
    fireEvent.change(nameInput, { target: { value: "" } });

    // Use fireEvent.submit to bypass native required attribute validation in jsdom
    const form = nameInput.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/team name is required/i)).toBeInTheDocument();
    });
    expect(teamsActions.createTeam).not.toHaveBeenCalled();
  });

  it("shows error and does NOT call createTeam when no captain is selected", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderNew();

    // Fill team name but leave captain empty
    const nameInput = screen.getByLabelText(/team name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Captainless Team");

    // Use fireEvent.submit to bypass native required attribute validation in jsdom
    const form = nameInput.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/captain is required/i)).toBeInTheDocument();
    });
    expect(teamsActions.createTeam).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3. Edit path
// ---------------------------------------------------------------------------

describe("TeamForm — edit path (isEdit=true)", () => {
  it("calls updateTeamMembers with updated roster on submit", async () => {
    vi.mocked(teamsActions.updateTeamMembers).mockResolvedValue({ ok: true });

    const team = makeTeam();
    const { onSuccess } = renderEdit(team);

    // In edit mode the captain is pre-selected; submit directly
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByRole("button", { name: /save team/i }));

    await waitFor(() => {
      expect(teamsActions.updateTeamMembers).toHaveBeenCalledWith(
        "team-abc",
        expect.arrayContaining([
          expect.objectContaining({ role: "captain", contact_id: "contact-captain" }),
        ])
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("team name input is disabled in edit mode and shows 'cannot be changed' note", () => {
    renderEdit(makeTeam());

    const nameInput = screen.getByLabelText(/team name/i);
    expect(nameInput).toBeDisabled();
    expect(screen.getByText(/team name cannot be changed here/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Sprint 30 — Session Select items prop regression test (#261 follow-up)
// Guard: trigger must display "Morning"/"Afternoon", not "morning"/"afternoon".
// ---------------------------------------------------------------------------

describe("TeamForm — sprint-30 Session Select items prop", () => {
  it("Session select trigger displays 'Morning' (capitalized) not 'morning' (raw value)", () => {
    const { container } = render(
      <TeamForm team={null} onSuccess={vi.fn()} onCancel={vi.fn()} />
    );

    // The Session select trigger should display the human-readable label
    const triggers = container.querySelectorAll('[data-slot="select-trigger"]');
    // Session is the first (and only) Select in the new-team form
    expect(triggers.length).toBeGreaterThanOrEqual(1);
    const sessionTrigger = triggers[0];
    expect(sessionTrigger.textContent).toContain("Morning");
    expect(sessionTrigger.textContent).not.toBe("morning");
  });
});
