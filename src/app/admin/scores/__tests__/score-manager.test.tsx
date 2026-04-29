/**
 * Tests for score-manager.tsx — Sprint 26 #212
 *
 * Regression guard: window.location.reload() must NOT be called after actions.
 * Asserts: router.refresh() called, toast.success() called with expected message.
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
  importScoresFromCSV: vi.fn(async () => ({ success: true, count: 2 })),
  deleteAllScores: vi.fn(async () => ({ success: true })),
}));

vi.mock("../score-modal", () => ({
  ScoreModal: ({
    onSuccess,
    open,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    mode: string;
    score: unknown;
    teams: unknown[];
    onSuccess: () => void;
  }) =>
    open ? (
      <div data-testid="score-drawer">
        <button data-testid="drawer-success" onClick={onSuccess}>
          Trigger Success
        </button>
      </div>
    ) : null,
}));

vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    onConfirm,
    title,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void | Promise<void>;
  }) =>
    open ? (
      <div data-testid="confirm-dialog" role="dialog" aria-label={title}>
        <button data-testid="confirm-delete" onClick={onConfirm}>
          Confirm
        </button>
      </div>
    ) : null,
}));

vi.mock("@/components/admin/admin-empty-state", () => ({
  AdminEmptyState: ({ title }: { title: string }) => (
    <div data-testid="admin-empty-state">{title}</div>
  ),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { ScoreManager } from "../score-manager";
import * as actions from "../actions";
import { toast } from "sonner";
import type { Score } from "@/types/database";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SCORE: Score = {
  id: "score-1",
  // team_name omitted — Sprint 32 contract drop; display = team→captain JOIN
  total_score: 72,
  session: "morning",
  year: 2026,
  source: "manual",
  created_at: "2026-01-01T00:00:00Z",
  team_id: "team-1",
  individual_scores: null,
} as Score;

function renderManager(scores: Score[] = [SCORE]) {
  return render(<ScoreManager scores={scores} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ScoreManager — Sprint 26 router.refresh regression (#212)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(actions.deleteAllScores).mockResolvedValue({ success: true });
    vi.mocked(actions.importScoresFromCSV).mockResolvedValue({ success: true, count: 2 });
  });

  // -------------------------------------------------------------------------
  // Clear All (delete-all) action
  // -------------------------------------------------------------------------
  describe("Clear All action", () => {
    it("calls router.refresh() after clear-all is confirmed", async () => {
      renderManager([SCORE]);

      // Open confirm dialog
      fireEvent.click(screen.getByText("Clear All"));

      // Confirm deletion
      await act(async () => {
        fireEvent.click(screen.getByTestId("confirm-delete"));
      });

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalledTimes(1);
      });
    });

    it("calls toast.success('Year cleared') after clear-all is confirmed", async () => {
      renderManager([SCORE]);

      fireEvent.click(screen.getByText("Clear All"));

      await act(async () => {
        fireEvent.click(screen.getByTestId("confirm-delete"));
      });

      await waitFor(() => {
        expect(vi.mocked(toast.success)).toHaveBeenCalledWith("Year cleared");
      });
    });

    it("does NOT call window.location.reload after clear-all", async () => {
      const reloadSpy = vi.fn();
      Object.defineProperty(window, "location", {
        value: { reload: reloadSpy },
        writable: true,
        configurable: true,
      });

      renderManager([SCORE]);
      fireEvent.click(screen.getByText("Clear All"));

      await act(async () => {
        fireEvent.click(screen.getByTestId("confirm-delete"));
      });

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalledTimes(1);
      });

      expect(reloadSpy).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Drawer onSuccess (add/edit score)
  // -------------------------------------------------------------------------
  describe("ScoreDrawer onSuccess", () => {
    it("calls router.refresh() when drawer onSuccess fires", async () => {
      renderManager([SCORE]);

      // Open the score drawer via Add Score button
      fireEvent.click(screen.getByText("Add Score"));

      await act(async () => {
        fireEvent.click(screen.getByTestId("drawer-success"));
      });

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it("does NOT call window.location.reload when drawer onSuccess fires", async () => {
      const reloadSpy = vi.fn();
      Object.defineProperty(window, "location", {
        value: { reload: reloadSpy },
        writable: true,
        configurable: true,
      });

      renderManager([SCORE]);
      fireEvent.click(screen.getByText("Add Score"));

      await act(async () => {
        fireEvent.click(screen.getByTestId("drawer-success"));
      });

      expect(reloadSpy).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // CSV import action
  // -------------------------------------------------------------------------
  describe("CSV import action", () => {
    it("calls router.refresh() after successful CSV import", async () => {
      renderManager([]);

      // Open CSV panel
      fireEvent.click(screen.getByText("Import CSV"));

      // Type CSV content
      const textarea = screen.getByPlaceholderText(/score,session/i);
      fireEvent.change(textarea, {
        target: { value: "Eagles,72,morning" },
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Import"));
      });

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalledTimes(1);
      });
    });

    it("does NOT call window.location.reload after successful CSV import", async () => {
      const reloadSpy = vi.fn();
      Object.defineProperty(window, "location", {
        value: { reload: reloadSpy },
        writable: true,
        configurable: true,
      });

      renderManager([]);
      fireEvent.click(screen.getByText("Import CSV"));
      const textarea = screen.getByPlaceholderText(/score,session/i);
      fireEvent.change(textarea, { target: { value: "Eagles,72,morning" } });

      await act(async () => {
        fireEvent.click(screen.getByText("Import"));
      });

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalledTimes(1);
      });

      expect(reloadSpy).not.toHaveBeenCalled();
    });
  });
});
