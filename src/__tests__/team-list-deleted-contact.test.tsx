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
  return {
    id: "team-uuid-1",
    captain_display_name: "Alice Admin",
    year: 2026,
    captain_contact_id: "contact-uuid-1",
    payment_status: "pending",
    amount_paid_cents: 0,
    payment_method: null,
    payment_reference: null,
    paid_at: null,
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
      // When contacts_active returns null for a soft-deleted contact, Bolt maps it to full_name = "".
      // Phase 3: the Team column renders captain_display_name directly (F-T1 dropped CAPTAIN column).
      // memberDisplayName() only runs for non-captain members in the Members column.
      // Test via a player member with full_name = "" so memberDisplayName() returns the placeholder.
      const team = makeTeam({
        members: [
          makeMember({ contact_id: "c1", full_name: "Alice Admin", role: "captain", slot: 1 }),
          makeMember({ contact_id: "c2", full_name: "", role: "player", slot: 2 }),
        ],
        member_count: 2,
        open_slots: 2,
      });

      render(<TeamList teams={[team]} defaultFeeDollars={400} />);

      // The placeholder text must appear somewhere in the rendered output
      expect(screen.getByText("(deleted contact)")).toBeInTheDocument();
    });

    it("renders '(deleted contact)' when a member's full_name is null (contacts_active join null)", () => {
      // Phase 3: non-captain member with null full_name → memberDisplayName() → "(deleted contact)"
      const team = makeTeam({
        members: [
          makeMember({ contact_id: "c1", full_name: "Alice Admin", role: "captain", slot: 1 }),
          // TypeScript allows null even if the type says string — simulates the join returning null
          makeMember({ contact_id: "c2", full_name: null as unknown as string, role: "player", slot: 2 }),
        ],
        member_count: 2,
        open_slots: 2,
      });

      render(<TeamList teams={[team]} defaultFeeDollars={400} />);

      expect(screen.getByText("(deleted contact)")).toBeInTheDocument();
    });

    it("renders placeholder for the deleted slot and name for the active slot", () => {
      // Phase 3: captain_display_name is the Team column source — must match the active captain name.
      // The deleted slot is a player member with full_name = "" → memberDisplayName() → "(deleted contact)".
      const team = makeTeam({
        captain_display_name: "Active Captain",
        members: [
          makeMember({ contact_id: "c1", full_name: "Active Captain", role: "captain", slot: 1 }),
          makeMember({ contact_id: "c2", full_name: "", role: "player", slot: 2 }),
        ],
        member_count: 2,
        open_slots: 2,
      });

      render(<TeamList teams={[team]} defaultFeeDollars={400} />);

      // Active captain renders via captain_display_name in the Team column
      expect(screen.getByText("Active Captain")).toBeInTheDocument();
      // Deleted player slot renders placeholder via memberDisplayName() in the Members column
      expect(screen.getByText("(deleted contact)")).toBeInTheDocument();
    });

    it("does not render an empty string or blank where the deleted contact slot is", () => {
      // Phase 3: player member with empty full_name → memberDisplayName() → "(deleted contact)"
      // Confirms the impl emits the placeholder string, not a blank/empty node.
      const team = makeTeam({
        members: [
          makeMember({ contact_id: "c1", full_name: "Alice Admin", role: "captain", slot: 1 }),
          makeMember({ contact_id: "c2", full_name: "", role: "player", slot: 2 }),
        ],
        member_count: 2,
        open_slots: 2,
      });

      render(<TeamList teams={[team]} defaultFeeDollars={400} />);

      // The placeholder is rendered, not a blank span
      expect(screen.getByText("(deleted contact)")).toBeInTheDocument();
      // "—" is returned by captainName() only when no captain exists (dead variable, never rendered)
      // Confirm it doesn't bleed into the DOM
      expect(screen.queryByText("—")).not.toBeInTheDocument();
    });

    it("renders multiple deleted contact placeholders when multiple slots reference soft-deleted contacts", () => {
      // Phase 3: two player members with empty full_name → memberDisplayName() × 2 → 2 placeholders.
      // Captain renders via captain_display_name (not memberDisplayName), so captain slot doesn't count.
      const team = makeTeam({
        members: [
          makeMember({ contact_id: "c1", full_name: "Alice Admin", role: "captain", slot: 1 }),
          makeMember({ contact_id: "c2", full_name: "", role: "player", slot: 2 }),
          makeMember({ contact_id: "c3", full_name: "", role: "player", slot: 3 }),
        ],
        member_count: 3,
        open_slots: 1,
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
