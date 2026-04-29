// RED: OpenSlotsBadge token bypass — #236
// Sprint 32 (#282): team_name dropped; display = captain full name via JOIN
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TeamList } from "@/app/admin/teams/team-list";
import type { TeamWithMembers } from "@/app/admin/teams/actions";

// Mock next/navigation (required since team-list.tsx uses useRouter)
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// Mock server actions
vi.mock("@/app/admin/teams/actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/admin/teams/actions")>();
  return {
    ...actual,
    markTeamPaid: vi.fn(),
    deleteTeam: vi.fn(),
    getScoreCount: vi.fn().mockResolvedValue(0),
  };
});

// Sprint 32: TeamModal replaces TeamDrawer
vi.mock("@/app/admin/teams/team-modal", () => ({
  TeamModal: () => null,
}));

// Fallback: also mock team-drawer in case the old file is still present
vi.mock("@/app/admin/teams/team-drawer", () => ({
  TeamDrawer: () => null,
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makeTeam(overrides: Partial<TeamWithMembers> = {}): TeamWithMembers {
  // @ts-expect-error Sprint 32: team_name dropped from type post-migration
  return {
    id: "team-1",
    // team_name omitted — Sprint 32 contract drop
    session: "morning",
    payment_status: "pending",
    amount_paid_cents: 0,
    member_count: 2,
    open_slots: 2,
    captain_contact_id: "c1",
    members: [
      {
        contact_id: "c1",
        full_name: "Alice Smith",
        role: "captain",
        slot: 1,
      },
    ],
    year: 2026,
    ...overrides,
  };
}

describe("OpenSlotsBadge — token classes (Sprint 32)", () => {
  it("renders a badge for a team with open slots", () => {
    render(<TeamList teams={[makeTeam({ open_slots: 2 })]} defaultFeeDollars={700} />);
    expect(screen.getByText(/2 open/i)).toBeInTheDocument();
  });

  it("badge uses bg-warning-muted class (design token), NOT bg-amber-100", () => {
    render(<TeamList teams={[makeTeam({ open_slots: 2 })]} defaultFeeDollars={700} />);
    const badge = screen.getByText(/2 open/i);
    expect(badge.className).toContain("bg-warning-muted");
    expect(badge.className).not.toContain("bg-amber-100");
  });

  it("badge uses text-warning class (design token), NOT text-amber-700", () => {
    render(<TeamList teams={[makeTeam({ open_slots: 2 })]} defaultFeeDollars={700} />);
    const badge = screen.getByText(/2 open/i);
    expect(badge.className).toContain("text-warning");
    expect(badge.className).not.toContain("text-amber-700");
  });

  it("no badge renders when team is full (open_slots = 0)", () => {
    render(<TeamList teams={[makeTeam({ open_slots: 0 })]} defaultFeeDollars={700} />);
    expect(screen.queryByText(/\d+ open/i)).not.toBeInTheDocument();
    expect(screen.getByText("Full")).toBeInTheDocument();
  });
});

describe("TeamList display — captain name (Sprint 32 RED)", () => {
  it("displays captain full name as team identity (not a team_name column)", () => {
    // RED until Bolt updates team-list.tsx to read captain from members JOIN
    render(
      <TeamList
        teams={[makeTeam({ members: [{ contact_id: "c1", full_name: "Alice Smith", role: "captain", slot: 1 }] })]}
        defaultFeeDollars={700}
      />
    );
    // Captain's full name should appear in the list as the team identifier
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });

  it("team list row does NOT render a raw team_name string", () => {
    // The old Eagle Squad team_name must not appear — display is captain-derived
    render(
      <TeamList
        teams={[makeTeam({ members: [{ contact_id: "c1", full_name: "Alice Smith", role: "captain", slot: 1 }] })]}
        defaultFeeDollars={700}
      />
    );
    // "Eagle Squad" was the old team_name fixture — it must not appear
    expect(screen.queryByText("Eagle Squad")).not.toBeInTheDocument();
  });
});
