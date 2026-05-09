/**
 * Sprint 32 — TeamModal behavioural tests (renamed from teams-drawer.test.tsx)
 *
 * Contract changes:
 *   - TeamDrawer retired; TeamModal is the new centered dialog (~800px)
 *   - team_name field dropped from TeamWithMembers and TeamForm
 *   - Team identity derives from captain's full name
 *   - Edit dialog header shows captain's full name (not "Edit Team: <team_name>")
 *
 * These tests are RED until Bolt ships the TeamModal component.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Hoist mocks
// ---------------------------------------------------------------------------

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

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

import { TeamList } from "@/app/admin/teams/team-list";
import * as teamsActions from "@/app/admin/teams/actions";
import { toast } from "sonner";
import type { TeamWithMembers } from "@/app/admin/teams/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sprint 32: TeamWithMembers no longer has team_name.
 * Display identity = captain's full_name from the members array.
 */
function makeTeam(overrides: Partial<TeamWithMembers> = {}): TeamWithMembers {
  return {
    id: "team-abc",
    captain_display_name: "Captain Jane",
    year: 2026,
    captain_contact_id: "contact-captain",
    payment_status: "pending",
    amount_paid_cents: 0,
    payment_method: null,
    payment_reference: null,
    paid_at: null,
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

describe("TeamModal — Sprint 32 (RED phase)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("modal opens instead of drawer", () => {
    it("Edit button in TeamList opens a centered modal (dialog role), not a sheet", async () => {
      const user = userEvent.setup();
      const team = makeTeam();

      render(<TeamList teams={[team]} defaultFeeDollars={200} />);

      // Phase 3: Edit button is hover-reveal icon-only; aria-label = "Edit <captain>'s team"
      await user.click(screen.getByRole("button", { name: /edit captain jane's team/i }));

      await waitFor(() => {
        // A dialog role indicates centered modal (not sheet/drawer)
        const dialog = screen.getByRole("dialog");
        expect(dialog).toBeInTheDocument();
      });
    });

    it("edit modal header shows captain full name as team identity", async () => {
      const user = userEvent.setup();
      const team = makeTeam();

      render(<TeamList teams={[team]} defaultFeeDollars={200} />);

      // Phase 3: Edit button is hover-reveal icon-only; aria-label = "Edit <captain>'s team"
      await user.click(screen.getByRole("button", { name: /edit captain jane's team/i }));

      await waitFor(() => {
        // Modal title should reference captain's name, not a team_name field
        const dialog = screen.getByRole("dialog");
        expect(dialog).toHaveTextContent(/Captain Jane/i);
      });
    });

    it("modal does NOT contain a team name input field", async () => {
      const user = userEvent.setup();
      const team = makeTeam();

      render(<TeamList teams={[team]} defaultFeeDollars={200} />);

      // Phase 3: Edit button is hover-reveal icon-only; aria-label = "Edit <captain>'s team"
      await user.click(screen.getByRole("button", { name: /edit captain jane's team/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // team_name input must not exist in the new modal form
      expect(screen.queryByLabelText(/team name/i)).not.toBeInTheDocument();
    });
  });

  describe("new team modal", () => {
    it("New Team button opens a centered modal dialog", async () => {
      const user = userEvent.setup();

      render(<TeamList teams={[makeTeam()]} defaultFeeDollars={200} />);

      await user.click(screen.getByRole("button", { name: /new team/i }));

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(dialog).toBeInTheDocument();
      });
    });

    it("new team modal does NOT contain a team name input field", async () => {
      const user = userEvent.setup();

      render(<TeamList teams={[makeTeam()]} defaultFeeDollars={200} />);

      await user.click(screen.getByRole("button", { name: /new team/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      expect(screen.queryByLabelText(/team name/i)).not.toBeInTheDocument();
    });
  });

  describe("captain is required (replaces team_name as primary field)", () => {
    it("captain selection is required — form does not submit without captain", async () => {
      const user = userEvent.setup();

      render(<TeamList teams={[makeTeam()]} defaultFeeDollars={200} />);

      await user.click(screen.getByRole("button", { name: /new team/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Submit without selecting a captain
      const form = document.querySelector("form");
      if (form) {
        fireEvent.submit(form);
      }

      // createTeam must NOT have been called without a captain
      expect(teamsActions.createTeam).not.toHaveBeenCalled();
    });
  });

  describe("successful save via modal", () => {
    it("updateTeamMembers called on submit and toast fired", async () => {
      vi.mocked(teamsActions.updateTeamMembers).mockResolvedValue({ ok: true });

      const user = userEvent.setup();
      const team = makeTeam();

      render(<TeamList teams={[team]} defaultFeeDollars={200} />);

      // Phase 3: Edit button is hover-reveal icon-only; aria-label = "Edit <captain>'s team"
      await user.click(screen.getByRole("button", { name: /edit captain jane's team/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /save team/i }));

      await waitFor(() => {
        expect(teamsActions.updateTeamMembers).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith("Team updated");
      });
    });
  });

  describe("DeleteConfirmDialog — paid-team type-to-confirm gate (#393)", () => {
    async function openDeleteDialog(team: TeamWithMembers) {
      const user = userEvent.setup();
      render(<TeamList teams={[team]} defaultFeeDollars={200} />);

      // Open the edit modal first (Phase 3: hover-reveal Edit button)
      await user.click(
        screen.getByRole("button", { name: /edit captain jane's team/i })
      );
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Click "Delete team" in the modal footer to open DeleteConfirmDialog
      await user.click(screen.getByRole("button", { name: /^delete team$/i }));

      // Wait for the destructive "Move to Trash" button to render
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /move to trash/i })
        ).toBeInTheDocument();
      });

      return { user };
    }

    it("paid team renders the type-to-confirm input with helper label", async () => {
      const paidTeam = makeTeam({
        payment_status: "paid",
        amount_paid_cents: 20000,
        paid_at: "2026-04-01T00:00:00Z",
      });

      await openDeleteDialog(paidTeam);

      // Helper label text is present and references the captain name
      expect(
        screen.getByText(/type the captain's full name to confirm/i)
      ).toBeInTheDocument();

      // The gated input is present
      expect(
        screen.getByTestId("delete-confirm-input")
      ).toBeInTheDocument();
    });

    it("paid team: Move to Trash button is disabled until exact-match is typed", async () => {
      const paidTeam = makeTeam({
        payment_status: "paid",
        amount_paid_cents: 20000,
      });

      const { user } = await openDeleteDialog(paidTeam);

      const trashBtn = screen.getByRole("button", { name: /move to trash/i });
      const input = screen.getByTestId("delete-confirm-input") as HTMLInputElement;

      // Wait for getScoreCount mock to resolve so the score-load gate doesn't mask the type-gate
      await waitFor(() => {
        // Bottom-of-button-disabled state is now driven by the type-gate, not score load
        expect(trashBtn).toBeDisabled();
      });

      // Wrong text — still disabled
      await user.type(input, "Wrong Name");
      expect(trashBtn).toBeDisabled();

      // Clear and type exact match
      await user.clear(input);
      await user.type(input, "Captain Jane");

      await waitFor(() => {
        expect(trashBtn).not.toBeDisabled();
      });
    });

    it("paid team: case mismatch keeps the button disabled", async () => {
      const paidTeam = makeTeam({
        payment_status: "paid",
        amount_paid_cents: 20000,
      });

      const { user } = await openDeleteDialog(paidTeam);

      const trashBtn = screen.getByRole("button", { name: /move to trash/i });
      const input = screen.getByTestId("delete-confirm-input") as HTMLInputElement;

      await user.type(input, "captain jane"); // wrong case

      // Strict equality — button stays disabled
      expect(trashBtn).toBeDisabled();
    });

    it("pending team renders no type-to-confirm input", async () => {
      const pendingTeam = makeTeam(); // default payment_status === "pending"

      await openDeleteDialog(pendingTeam);

      expect(
        screen.queryByTestId("delete-confirm-input")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/type the captain's full name/i)
      ).not.toBeInTheDocument();
    });
  });
});
