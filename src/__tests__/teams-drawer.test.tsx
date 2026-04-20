/**
 * S14-C — TeamDrawer behavioural tests
 *
 * Covers:
 *   1. Clicking Edit in a row opens the drawer in edit mode
 *   2. "New Team" button opens the drawer in create mode
 *   3. Successful form save → toast fired → drawer closes
 *   4. onOpenChange(false) without saving → no action called
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Hoist mocks
// ---------------------------------------------------------------------------

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/app/admin/teams/actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/admin/teams/actions")>();
  return {
    ...actual,
    searchContacts: vi.fn().mockResolvedValue([]),
    createTeam: vi.fn(),
    updateTeamMembers: vi.fn(),
    deleteTeam: vi.fn(),
    getScoreCount: vi.fn().mockResolvedValue(0),
    markTeamPaid: vi.fn(),
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
  return { ...actual, X: () => null, Plus: () => null, Trash2: () => null };
});

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { TeamDrawer } from "@/app/admin/teams/team-drawer";
import { TeamList } from "@/app/admin/teams/team-list";
import * as teamsActions from "@/app/admin/teams/actions";
import { toast } from "sonner";
import type { TeamWithMembers } from "@/app/admin/teams/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TeamDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Edit button in TeamList opens the drawer in edit mode", async () => {
    const user = userEvent.setup();
    const team = makeTeam();

    render(<TeamList teams={[team]} defaultFeeDollars={200} />);

    await user.click(screen.getByRole("button", { name: /^edit$/i }));

    await waitFor(() => {
      expect(screen.getByText(`Edit Team: ${team.team_name}`)).toBeInTheDocument();
    });
  });

  it("2. New Team button opens the drawer in create mode", async () => {
    const user = userEvent.setup();

    render(<TeamList teams={[makeTeam()]} defaultFeeDollars={200} />);

    await user.click(screen.getByRole("button", { name: /new team/i }));

    await waitFor(() => {
      // The SheetTitle "New Team" appears inside the drawer header
      const headings = screen.getAllByText("New Team");
      // At least 2: the action-bar button + the sheet title
      expect(headings.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("3. Successful save calls onSuccess and fires a toast", async () => {
    vi.mocked(teamsActions.updateTeamMembers).mockResolvedValue({ ok: true });

    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    const team = makeTeam();

    render(
      <TeamDrawer
        open={true}
        mode="edit"
        team={team}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />
    );

    // The form pre-fills captain for edit mode — just submit
    await user.click(screen.getByRole("button", { name: /save team/i }));

    await waitFor(() => {
      expect(teamsActions.updateTeamMembers).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Team updated");
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("4. Closing drawer via onOpenChange(false) does not call any action", async () => {
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();
    const team = makeTeam();

    const { rerender } = render(
      <TeamDrawer
        open={true}
        mode="edit"
        team={team}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />
    );

    // Simulate parent calling onOpenChange(false) without saving
    rerender(
      <TeamDrawer
        open={false}
        mode="edit"
        team={team}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />
    );

    expect(teamsActions.updateTeamMembers).not.toHaveBeenCalled();
    expect(teamsActions.createTeam).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
