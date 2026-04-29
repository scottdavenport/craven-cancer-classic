/**
 * #170 + Sprint 32 (#282) — TeamForm submit path coverage
 *
 * Tests the create and edit submit paths, validation gates, and isEdit render
 * branch in TeamForm (src/app/admin/teams/team-form.tsx).
 *
 * Sprint 32 contract changes (RED phase — fail until Bolt ships Phase 2):
 * - team_name field removed from TeamInput and TeamForm
 * - Captain selection is the primary required identity field
 * - createTeam payload must NOT include team_name
 * - "Team name is required" validation gone (field dropped)
 * - Captain-is-required validation is the primary gate
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
  // @ts-expect-error Sprint 32: team_name dropped from type post-migration
  return {
    id: "team-abc",
    // team_name omitted — Sprint 32 contract drop
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
// 1. Create path — captain + full roster (Sprint 32: no team_name)
// ---------------------------------------------------------------------------

describe("TeamForm — create path (Sprint 32)", () => {
  it("creates team via captain selection — payload has captain_contact_id, NO team_name", async () => {
    // RED: createTeam's TeamInput type will drop team_name. Until Bolt ships Phase 2,
    // the current form still sends team_name, causing this assertion to fail.
    vi.mocked(teamsActions.createTeam).mockResolvedValue({ team_id: "new-team-id" });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { onSuccess } = renderNew();

    // Select captain — captain is the team identity
    await selectCaptain(user, makeContact("cap-1", "Captain Jack"));

    // Submit
    await user.click(screen.getByRole("button", { name: /save team/i }));

    await waitFor(() => {
      expect(teamsActions.createTeam).toHaveBeenCalledWith(
        expect.objectContaining({
          captain_contact_id: "cap-1",
        })
      );
      // team_name must NOT be in the payload
      const callArg = vi.mocked(teamsActions.createTeam).mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(callArg).not.toHaveProperty("team_name");
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("createTeam payload does not include team_name even when captain and players are set", async () => {
    vi.mocked(teamsActions.createTeam).mockResolvedValue({ team_id: "new-team-id" });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderNew();

    await selectCaptain(user, makeContact("cap-2", "Lone Ranger"));

    await user.click(screen.getByRole("button", { name: /save team/i }));

    await waitFor(() => {
      expect(teamsActions.createTeam).toHaveBeenCalledWith(
        expect.objectContaining({
          captain_contact_id: "cap-2",
          player_contact_ids: [],
        })
      );
      const callArg = vi.mocked(teamsActions.createTeam).mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(callArg).not.toHaveProperty("team_name");
    });
  });

  it("renders error message and does NOT call createTeam when createTeam returns error", async () => {
    vi.mocked(teamsActions.createTeam).mockResolvedValue({ error: "RPC failed" });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { onSuccess } = renderNew();

    await selectCaptain(user, makeContact("cap-3", "Error Captain"));

    await user.click(screen.getByRole("button", { name: /save team/i }));

    await waitFor(() => {
      expect(screen.getByText("RPC failed")).toBeInTheDocument();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 2. Validation errors (Sprint 32)
// ---------------------------------------------------------------------------

describe("TeamForm — validation (Sprint 32)", () => {
  it("form does NOT have a team name input field", () => {
    // Sprint 32 RED: team_name input must be absent from the form.
    // Today (pre-Phase 2) this fails because the input still exists.
    renderNew();

    expect(screen.queryByLabelText(/^team name$/i)).not.toBeInTheDocument();
  });

  it("shows error and does NOT call createTeam when no captain is selected", async () => {
    renderNew();

    // Submit without captain
    const form = document.querySelector("form")!;
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

  it("edit form does not render a team name input (field is dropped)", () => {
    // Sprint 32 RED: team name field must not appear in edit mode either.
    renderEdit(makeTeam());

    expect(screen.queryByLabelText(/^team name$/i)).not.toBeInTheDocument();
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
