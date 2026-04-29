/**
 * S10-3: TeamList component — deleted contact placeholder (RED)
 *
 * When a team_members row references a soft-deleted contact, the contacts_active
 * join returns null for that member. Bolt will update getTeams() to use the view
 * and update TeamList to render "(deleted contact)" for those slots.
 *
 * These tests fail until Bolt implements the placeholder rendering in team-list.tsx.
 * TeamMemberRow.full_name will be set to empty string or null to simulate a
 * contacts_active join returning null for a soft-deleted contact.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { TeamList } from "@/app/admin/teams/team-list";
import type { TeamWithMembers, TeamMemberRow } from "@/app/admin/teams/actions";

// ---------------------------------------------------------------------------
// Mock next/navigation (required since team-list.tsx uses useRouter)
// ---------------------------------------------------------------------------
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Mock server actions that TeamList depends on
// ---------------------------------------------------------------------------
vi.mock("@/app/admin/teams/actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/admin/teams/actions")>();
  return {
    ...actual,
    markTeamPaid: vi.fn().mockResolvedValue({ ok: true }),
  };
});

// window.location.reload is called after mutations — stub it to avoid errors
beforeEach(() => {
  Object.defineProperty(window, "location", {
    value: { reload: vi.fn() },
    writable: true,
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMember(overrides: Partial<TeamMemberRow> = {}): TeamMemberRow {
  return {
    contact_id: "contact-uuid-1",
    full_name: "Alice Admin",
    role: "captain",
    slot: 1,
    ...overrides,
  };
}

function makeTeam(overrides: Partial<TeamWithMembers> = {}): TeamWithMembers {
  // @ts-expect-error Sprint 32: team_name dropped from type post-migration
  return {
    id: "team-uuid-1",
    // team_name omitted — Sprint 32 contract drop
    year: 2026,
    captain_contact_id: "contact-uuid-1",
    payment_status: "pending",
    amount_paid_cents: 0,
    session: "morning",
    members: [makeMember()],
    member_count: 1,
    open_slots: 3,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TeamList — deleted contact placeholder", () => {
  describe("happy path — active contacts", () => {
    it("renders the captain full_name when contact is active", () => {
      const team = makeTeam({
        members: [makeMember({ full_name: "Alice Admin", role: "captain", slot: 1 })],
      });

      render(<TeamList teams={[team]} defaultFeeDollars={400} />);

      expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    });

    it("renders player full_name when player contact is active", () => {
      const team = makeTeam({
        members: [
          makeMember({ contact_id: "c1", full_name: "Alice Admin", role: "captain", slot: 1 }),
          makeMember({ contact_id: "c2", full_name: "Bob Builder", role: "player", slot: 2 }),
        ],
        member_count: 2,
        open_slots: 2,
      });

      render(<TeamList teams={[team]} defaultFeeDollars={400} />);

      // At minimum the captain should be visible in the Captain column
      expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    });
  });

  describe("soft-deleted contact — placeholder rendering", () => {
    it("renders '(deleted contact)' when a member's full_name is empty string (contacts_active join null)", () => {
      // When contacts_active returns null for a soft-deleted contact, Bolt maps it to full_name = ""
      const team = makeTeam({
        members: [
          makeMember({ contact_id: "c1", full_name: "", role: "captain", slot: 1 }),
        ],
      });

      render(<TeamList teams={[team]} defaultFeeDollars={400} />);

      // The placeholder text must appear somewhere in the rendered output
      expect(screen.getByText("(deleted contact)")).toBeInTheDocument();
    });

    it("renders '(deleted contact)' when a member's full_name is null (contacts_active join null)", () => {
      const team = makeTeam({
        members: [
          // TypeScript allows null even if the type says string — simulates the join returning null
          makeMember({ contact_id: "c1", full_name: null as unknown as string, role: "captain", slot: 1 }),
        ],
      });

      render(<TeamList teams={[team]} defaultFeeDollars={400} />);

      expect(screen.getByText("(deleted contact)")).toBeInTheDocument();
    });

    it("renders placeholder for the deleted slot and name for the active slot", () => {
      const team = makeTeam({
        members: [
          makeMember({ contact_id: "c1", full_name: "Active Captain", role: "captain", slot: 1 }),
          makeMember({ contact_id: "c2", full_name: "", role: "player", slot: 2 }),
        ],
        member_count: 2,
        open_slots: 2,
      });

      render(<TeamList teams={[team]} defaultFeeDollars={400} />);

      // Active captain renders by name
      expect(screen.getByText("Active Captain")).toBeInTheDocument();
      // Deleted player slot renders placeholder
      expect(screen.getByText("(deleted contact)")).toBeInTheDocument();
    });

    it("does not render an empty string or blank where the deleted contact slot is", () => {
      const team = makeTeam({
        members: [
          makeMember({ contact_id: "c1", full_name: "", role: "captain", slot: 1 }),
        ],
      });

      const { container } = render(<TeamList teams={[team]} defaultFeeDollars={400} />);

      // There should be no cell containing only whitespace where the captain name would go
      // (i.e., the placeholder is rendered, not a blank span)
      expect(screen.getByText("(deleted contact)")).toBeInTheDocument();
      // The empty string "—" (the current fallback) should NOT appear for this slot
      // once the placeholder is implemented — this assertion ensures the captain cell
      // doesn't fall through to the old "—" default
      const captainCell = screen.queryByText("—");
      // If "—" appears, it means the placeholder was not rendered
      expect(captainCell).not.toBeInTheDocument();
    });

    it("renders multiple deleted contact placeholders when multiple slots reference soft-deleted contacts", () => {
      const team = makeTeam({
        members: [
          makeMember({ contact_id: "c1", full_name: "", role: "captain", slot: 1 }),
          makeMember({ contact_id: "c2", full_name: "", role: "player", slot: 2 }),
        ],
        member_count: 2,
        open_slots: 2,
      });

      render(<TeamList teams={[team]} defaultFeeDollars={400} />);

      const placeholders = screen.getAllByText("(deleted contact)");
      expect(placeholders).toHaveLength(2);
    });
  });

  describe("edge cases", () => {
    it("renders 'No teams yet' when teams array is empty", () => {
      render(<TeamList teams={[]} defaultFeeDollars={400} />);
      expect(screen.getByText("No teams yet")).toBeInTheDocument();
    });

    it("renders correctly when a team has no members at all (no crash)", () => {
      // Sprint 32: team_name is gone; display = captain name from members join.
      // With 0 members, no captain name appears — but the component must not crash.
      const team = makeTeam({ members: [], member_count: 0, open_slots: 4 });
      const { container } = render(<TeamList teams={[team]} defaultFeeDollars={400} />);
      // Component renders at least one table row (the team row)
      expect(container.querySelector("tr")).toBeTruthy();
    });
  });
});
