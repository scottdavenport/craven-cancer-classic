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
  // @ts-expect-error Sprint 32: team_name dropped from type post-migration
  return {
    id: "team-abc",
    // team_name deliberately omitted — Sprint 32 contract drop
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

describe("TeamModal — Sprint 32 (RED phase)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("modal opens instead of drawer", () => {
    it("Edit button in TeamList opens a centered modal (dialog role), not a sheet", async () => {
      const user = userEvent.setup();
      const team = makeTeam();

      render(<TeamList teams={[team]} defaultFeeDollars={200} />);

      await user.click(screen.getByRole("button", { name: /^edit$/i }));

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

      await user.click(screen.getByRole("button", { name: /^edit$/i }));

      await waitFor(() => {
        // Modal title should reference captain's name, not a team_name field
        expect(screen.getByText(/Captain Jane/i)).toBeInTheDocument();
      });
    });

    it("modal does NOT contain a team name input field", async () => {
      const user = userEvent.setup();
      const team = makeTeam();

      render(<TeamList teams={[team]} defaultFeeDollars={200} />);

      await user.click(screen.getByRole("button", { name: /^edit$/i }));

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

      await user.click(screen.getByRole("button", { name: /^edit$/i }));

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
});
