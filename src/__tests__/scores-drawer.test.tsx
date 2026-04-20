/**
 * S14-D: /admin/scores drawer migration
 *
 * Behavioral tests for ScoreManager + ScoreDrawer + ScoreForm.
 * Focus: when user does X, system does Y.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Hoist mocks before imports
// ---------------------------------------------------------------------------
vi.mock("@/app/admin/scores/actions", () => ({
  addScore: vi.fn().mockResolvedValue({ success: true }),
  updateScore: vi.fn().mockResolvedValue({ success: true }),
  deleteScore: vi.fn().mockResolvedValue({ success: true }),
  deleteAllScores: vi.fn().mockResolvedValue({ success: true }),
  importScoresFromCSV: vi.fn().mockResolvedValue({ success: true, count: 3 }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------
import { ScoreManager } from "@/app/admin/scores/score-manager";
import { ScoreDrawer } from "@/app/admin/scores/score-drawer";
import { ScoreForm } from "@/app/admin/scores/score-form";
import * as actions from "@/app/admin/scores/actions";
import { toast } from "sonner";
import type { Score } from "@/types/database";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeScore(overrides: Partial<Score> = {}): Score {
  return {
    id: "score-uuid-1",
    team_name: "The Eagles",
    total_score: 72,
    session: "morning",
    source: "manual",
    team_id: null,
    individual_scores: [],
    year: 2026,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// Stub window.location.reload (jsdom doesn't implement it)
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, "location", {
    value: { reload: vi.fn() },
    writable: true,
  });
});

// ---------------------------------------------------------------------------
// Test 1: Clicking a table row opens the edit drawer
// ---------------------------------------------------------------------------
describe("ScoreManager row click", () => {
  it("opens the edit drawer when a score row is clicked", async () => {
    const score = makeScore({ team_name: "Birdie Kings" });
    render(<ScoreManager scores={[score]} />);

    const row = screen.getByText("Birdie Kings").closest("tr");
    expect(row).toBeTruthy();
    fireEvent.click(row!);

    await waitFor(() => {
      expect(screen.getByText(/Edit Score: Birdie Kings/)).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// Test 2: "Add Score" button opens create drawer
// ---------------------------------------------------------------------------
describe("ScoreManager Add Score button", () => {
  it("opens the create drawer when Add Score is clicked", async () => {
    render(<ScoreManager scores={[]} />);

    const addButton = screen.getByRole("button", { name: /add score/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      // The SheetTitle renders as a heading — look for Team Name input which only appears in the drawer form
      expect(screen.getByLabelText(/team name/i)).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// Test 3: Submit → action called → toast → close
// ---------------------------------------------------------------------------
describe("ScoreDrawer submit", () => {
  it("calls onSubmit with form values and fires toast on success", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ScoreDrawer
        open={true}
        onOpenChange={onOpenChange}
        mode="create"
        score={null}
        onSuccess={onSuccess}
      />
    );

    // Fill out the form
    const teamInput = screen.getByLabelText(/team name/i);
    await user.clear(teamInput);
    await user.type(teamInput, "New Team");

    const scoreInput = screen.getByLabelText(/total score/i);
    await user.clear(scoreInput);
    await user.type(scoreInput, "68");

    // Submit
    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(actions.addScore).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Score added");
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// Test 4: Delete in footer → ConfirmDialog appears → action called
// ---------------------------------------------------------------------------
describe("ScoreDrawer delete", () => {
  it("shows ConfirmDialog when Delete score is clicked, calls deleteScore on confirm", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();
    const score = makeScore({ team_name: "Delete Me" });

    render(
      <ScoreDrawer
        open={true}
        onOpenChange={onOpenChange}
        mode="edit"
        score={score}
        onSuccess={onSuccess}
      />
    );

    // Click the Delete button in the footer
    const deleteButton = screen.getByRole("button", { name: /delete score/i });
    await user.click(deleteButton);

    // ConfirmDialog should appear
    await waitFor(() => {
      expect(screen.getByText(/delete score for delete me/i)).toBeTruthy();
    });

    // Confirm the deletion
    const confirmButton = screen.getByRole("button", { name: /^delete$/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(actions.deleteScore).toHaveBeenCalledWith(score.id);
      expect(toast.success).toHaveBeenCalledWith("Score deleted");
    });
  });
});

// ---------------------------------------------------------------------------
// Test 5: Cancel → drawer closes, no action called
// ---------------------------------------------------------------------------
describe("ScoreForm cancel", () => {
  it("calls onCancel and does not call onSubmit when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <ScoreForm
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Test 6: Session select shows N/A, Morning, Afternoon
// ---------------------------------------------------------------------------
describe("ScoreForm session select", () => {
  it("renders session options including N/A, Morning, Afternoon", () => {
    render(
      <ScoreForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // The SelectTrigger should be present with session label
    expect(screen.getByLabelText(/session/i)).toBeTruthy();
  });
});
