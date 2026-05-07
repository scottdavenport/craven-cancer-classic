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

// Sprint 32: TeamModal replaces TeamDrawer
vi.mock("../team-modal", () => ({
  TeamModal: ({
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
      <div data-testid="team-drawer" role="dialog">
        <button data-testid="drawer-success" onClick={onSuccess}>
          Save
        </button>
      </div>
    ) : null,
}));

// Fallback: also mock old drawer in case file not yet deleted
vi.mock("../team-drawer", () => ({
  TeamDrawer: () => null,
}));

// Phase 3: mock base-ui Select as native <select> so jsdom can drive it without
// floating-ui / portal / keyboard-navigation complexity.
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
    items?: Record<string, string>;
    children: React.ReactNode;
  }) => (
    <select
      data-testid="payment-method-select"
      value={value ?? ""}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      <option value="">Select method</option>
      <option value="check">Check</option>
      <option value="cash">Cash</option>
      <option value="venmo">Venmo</option>
      <option value="zelle">Zelle</option>
      <option value="wire">Wire</option>
      <option value="comped">Comped</option>
      <option value="stripe">Stripe</option>
      <option value="other">Other</option>
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
  SelectGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectLabel: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectSeparator: () => null,
  SelectScrollUpButton: () => null,
  SelectScrollDownButton: () => null,
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
    captain_display_name: "Alice Captain",
    year: 2026,
    captain_contact_id: "c-1",
    payment_status: "pending",
    amount_paid_cents: 0,
    payment_method: null,
    payment_reference: null,
    paid_at: null,
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

      // Phase 3: Edit is now hover-reveal icon-only with aria-label "Edit <captain>'s team"
      fireEvent.click(screen.getByRole("button", { name: /edit alice captain's team/i }));

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

      // Phase 3: Edit is now hover-reveal icon-only with aria-label "Edit <captain>'s team"
      fireEvent.click(screen.getByRole("button", { name: /edit alice captain's team/i }));

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
      // Phase 3: Edit is now hover-reveal icon-only with aria-label "Edit <captain>'s team"
      fireEvent.click(screen.getByRole("button", { name: /edit alice captain's team/i }));

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

      // Phase 3: button text is "Mark paid" (lowercase); lives in RowActions surfaceSpecial slot
      fireEvent.click(screen.getByText("Mark paid"));

      // F-T8 P1: payment method is required before Confirm succeeds
      fireEvent.change(screen.getByTestId("payment-method-select"), {
        target: { value: "check" },
      });

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

      // Phase 3: button text is "Mark paid" (lowercase)
      fireEvent.click(screen.getByText("Mark paid"));

      // F-T8 P1: payment method is required before Confirm succeeds
      fireEvent.change(screen.getByTestId("payment-method-select"), {
        target: { value: "check" },
      });

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
      // Phase 3: button text is "Mark paid" (lowercase)
      fireEvent.click(screen.getByText("Mark paid"));

      // F-T8 P1: payment method is required before Confirm succeeds
      fireEvent.change(screen.getByTestId("payment-method-select"), {
        target: { value: "check" },
      });

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
