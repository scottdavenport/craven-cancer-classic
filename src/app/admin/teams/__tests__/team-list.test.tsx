/**
 * Tests for team-list.tsx — Sprint 26 #139
 *
 * Regression guard: window.location.reload() must NOT be called after actions.
 * Asserts: router.refresh() called, toast.success() called with expected messages.
 */

import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be at module top level
// ---------------------------------------------------------------------------

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../actions", () => ({
  markTeamPaid: vi.fn(async () => ({ ok: true })),
  deleteTeam: vi.fn(async () => ({ ok: true })),
  getScoreCount: vi.fn(async () => 0),
}));

vi.mock("../team-drawer", () => ({
  TeamDrawer: ({
    open,
    onSuccess,
  }: {
    open: boolean;
    mode: string;
    team: unknown;
    onOpenChange: (v: boolean) => void;
    onSuccess: () => void;
  }) =>
    open ? (
      <div data-testid="team-drawer">
        <button data-testid="drawer-success" onClick={onSuccess}>
          Save
        </button>
      </div>
    ) : null,
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { TeamList } from "../team-list";
import * as actions from "../actions";
import { toast } from "sonner";
import type { TeamWithMembers } from "../actions";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeTeam(overrides: Partial<TeamWithMembers> = {}): TeamWithMembers {
  return {
    id: "team-1",
    team_name: "Eagles",
    year: 2026,
    captain_contact_id: "c-1",
    payment_status: "pending",
    amount_paid_cents: 0,
    session: "morning",
    member_count: 1,
    open_slots: 3,
    members: [
      {
        contact_id: "c-1",
        full_name: "Alice Captain",
        role: "captain",
        slot: 1,
      },
    ],
    ...overrides,
  };
}

function renderList(teams: TeamWithMembers[] = [makeTeam()], defaultFeeDollars = 700) {
  return render(<TeamList teams={teams} defaultFeeDollars={defaultFeeDollars} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TeamList — Sprint 26 router.refresh regression (#139)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(actions.markTeamPaid).mockResolvedValue({ ok: true });
  });

  // -------------------------------------------------------------------------
  // handleDrawerSuccess — called when TeamDrawer save succeeds
  // -------------------------------------------------------------------------
  describe("handleDrawerSuccess (drawer onSuccess)", () => {
    it("calls router.refresh() after drawer save", async () => {
      renderList();

      // Open drawer via Edit button
      fireEvent.click(screen.getByText("Edit"));

      await act(async () => {
        fireEvent.click(screen.getByTestId("drawer-success"));
      });

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it("does NOT fire its own toast after drawer save (drawer owns the per-mode toast)", async () => {
      // team-drawer.tsx fires toast.success("Team created" | "Team updated")
      // before invoking onSuccess. team-list must NOT add another, otherwise
      // every save stacks two toasts (Watchdog catch on PR #260).
      renderList();

      fireEvent.click(screen.getByText("Edit"));

      await act(async () => {
        fireEvent.click(screen.getByTestId("drawer-success"));
      });

      expect(vi.mocked(toast.success)).not.toHaveBeenCalled();
    });

    it("does NOT call window.location.reload after drawer save", async () => {
      const reloadSpy = vi.fn();
      Object.defineProperty(window, "location", {
        value: { reload: reloadSpy },
        writable: true,
        configurable: true,
      });

      renderList();
      fireEvent.click(screen.getByText("Edit"));

      await act(async () => {
        fireEvent.click(screen.getByTestId("drawer-success"));
      });

      expect(reloadSpy).not.toHaveBeenCalled();
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // handleMarkPaidDone — called when MarkPaidForm submit succeeds
  // -------------------------------------------------------------------------
  describe("handleMarkPaidDone (mark paid action)", () => {
    it("calls router.refresh() after team is marked paid", async () => {
      renderList();

      // Open the inline mark-paid form
      fireEvent.click(screen.getByText("Mark Paid"));

      // Submit with default amount
      await act(async () => {
        fireEvent.click(screen.getByText("Confirm"));
      });

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalledTimes(1);
      });
    });

    it("calls toast.success('Payment recorded') after team is marked paid", async () => {
      renderList();

      fireEvent.click(screen.getByText("Mark Paid"));

      await act(async () => {
        fireEvent.click(screen.getByText("Confirm"));
      });

      await waitFor(() => {
        expect(vi.mocked(toast.success)).toHaveBeenCalledWith("Payment recorded");
      });
    });

    it("does NOT call window.location.reload after marking paid", async () => {
      const reloadSpy = vi.fn();
      Object.defineProperty(window, "location", {
        value: { reload: reloadSpy },
        writable: true,
        configurable: true,
      });

      renderList();
      fireEvent.click(screen.getByText("Mark Paid"));

      await act(async () => {
        fireEvent.click(screen.getByText("Confirm"));
      });

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalledTimes(1);
      });

      expect(reloadSpy).not.toHaveBeenCalled();
    });
  });
});
