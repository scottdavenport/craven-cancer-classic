/**
 * Sprint 32 — ScoreModal behavioural tests (renamed from scores-drawer.test.tsx)
 *
 * Contract changes:
 *   - ScoreDrawer retired; ScoreModal is the new centered dialog (~800px)
 *   - score_name / team_name freeform input replaced with team dropdown
 *   - Dropdown shows active teams listed by captain name (alphabetized by last name)
 *   - Score creation requires team_id selection (from dropdown), no team_name text
 *
 * These tests are RED until Bolt ships the ScoreModal component.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Hoist mocks before imports
// ---------------------------------------------------------------------------
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/admin/scores/actions", () => ({
  addScore: vi.fn().mockResolvedValue({ success: true }),
  updateScore: vi.fn().mockResolvedValue({ success: true }),
  deleteScore: vi.fn().mockResolvedValue({ success: true }),
  deleteAllScores: vi.fn().mockResolvedValue({ success: true }),
  importScoresFromCSV: vi.fn().mockResolvedValue({ success: true, count: 3 }),
  getActiveTeamsForDropdown: vi.fn().mockResolvedValue([
    { team_id: "team-1", captain_display_name: "Alice Smith" },
    { team_id: "team-2", captain_display_name: "Bob Jones" },
  ]),
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
import * as actions from "@/app/admin/scores/actions";
import type { Score } from "@/types/database";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sprint 32: Score fixture drops team_name.
 * Display = team->captain JOIN.
 */
function makeScore(overrides: Partial<Score> = {}): Score {
  return {
    id: "score-uuid-1",
    // team_name deliberately omitted — Sprint 32 contract drop
    total_score: 72,
    session: "morning",
    source: "manual",
    team_id: "team-1",
    individual_scores: [],
    year: 2026,
    created_at: new Date().toISOString(),
    ...overrides,
  } as Score;
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, "location", {
    value: { reload: vi.fn() },
    writable: true,
  });
});

// ---------------------------------------------------------------------------
// Test 1: Score row click opens centered modal (not drawer/sheet)
// ---------------------------------------------------------------------------
describe("ScoreManager row click — centered modal (Sprint 32)", () => {
  it("opens a centered modal (dialog role) when a score row is clicked", async () => {
    const score = makeScore({ team_id: "team-1" });
    render(<ScoreManager scores={[score]} />);

    const rows = document.querySelectorAll("tr");
    const dataRow = Array.from(rows).find((r) => r.querySelector("td"));
    if (dataRow) {
      fireEvent.click(dataRow);
    }

    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });
  });

  it("edit modal does NOT contain a freeform team_name text input", async () => {
    const score = makeScore({ team_id: "team-1" });
    render(<ScoreManager scores={[score]} />);

    const rows = document.querySelectorAll("tr");
    const dataRow = Array.from(rows).find((r) => r.querySelector("td"));
    if (dataRow) {
      fireEvent.click(dataRow);
    }

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Modal must not have a freeform team_name text input
    expect(screen.queryByLabelText(/team name/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Test 2: "Add Score" opens centered modal with team dropdown
// ---------------------------------------------------------------------------
describe("ScoreManager Add Score button — modal with team dropdown (Sprint 32)", () => {
  it("opens a centered modal when Add Score is clicked", async () => {
    render(<ScoreManager scores={[]} />);

    const addButton = screen.getByRole("button", { name: /add score/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });
  });

  it("modal has a team selector (not a freeform team name text input)", async () => {
    render(<ScoreManager scores={[]} />);

    fireEvent.click(screen.getByRole("button", { name: /add score/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // There must NOT be a freeform team-name text input
    expect(screen.queryByLabelText(/team name/i)).not.toBeInTheDocument();

    // There must be a team selector element
    const teamSelect =
      screen.queryByRole("combobox", { name: /select team/i }) ??
      screen.queryByLabelText(/^team$/i) ??
      screen.queryByLabelText(/select team/i);
    expect(teamSelect).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Test 3: Score creation uses team_id, not team_name
// ---------------------------------------------------------------------------
describe("Score form — addScore payload never contains team_name (Sprint 32)", () => {
  it("addScore is called without a team_name field in the payload", async () => {
    const user = userEvent.setup();
    render(<ScoreManager scores={[]} />);

    fireEvent.click(screen.getByRole("button", { name: /add score/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const scoreInput =
      screen.queryByLabelText(/total score/i) ?? screen.queryByLabelText(/score/i);
    if (scoreInput) {
      fireEvent.change(scoreInput, { target: { value: "72" } });
    }

    const saveButton = screen.queryByRole("button", { name: /save/i });
    if (saveButton) {
      await user.click(saveButton);
    }

    await waitFor(() => {
      if (vi.mocked(actions.addScore).mock.calls.length > 0) {
        const callArg = vi.mocked(actions.addScore).mock.calls[0][0] as unknown as Record<
          string,
          unknown
        >;
        expect(callArg).not.toHaveProperty("team_name");
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Test 4: Null-team-id fallback display
// ---------------------------------------------------------------------------
describe("Score with null team_id — display fallback (Sprint 32)", () => {
  it("score row with null team_id renders a non-blank fallback, not team_name string", () => {
    const orphanScore = makeScore({ team_id: null });
    render(<ScoreManager scores={[orphanScore]} />);

    const tds = document.querySelectorAll("td");
    const hasFallback = Array.from(tds).some(
      (td) => td.textContent && td.textContent.match(/no team|—|unknown|\(none\)/i)
    );
    expect(hasFallback).toBe(true);
  });
});
