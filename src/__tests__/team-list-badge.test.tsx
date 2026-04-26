// RED: OpenSlotsBadge token bypass — #236
// Fails until Bolt replaces bg-amber-100/text-amber-700 with bg-warning-muted/text-warning.
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

// Mock TeamDrawer (sheet component — not under test here)
vi.mock("@/app/admin/teams/team-drawer", () => ({
  TeamDrawer: () => null,
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makeTeam(overrides: Partial<TeamWithMembers> = {}): TeamWithMembers {
  return {
    id: "team-1",
    team_name: "Eagle Squad",
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

describe("OpenSlotsBadge — token classes", () => {
  it("renders a badge for a team with open slots", () => {
    render(<TeamList teams={[makeTeam({ open_slots: 2 })]} defaultFeeDollars={700} />);
    // Badge should render with text like "2 open"
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
    // "N open" badge should not render; "Open Slots" column header is OK to exist
    expect(screen.queryByText(/\d+ open/i)).not.toBeInTheDocument();
    // "Full" text should be present instead
    expect(screen.getByText("Full")).toBeInTheDocument();
  });
});
