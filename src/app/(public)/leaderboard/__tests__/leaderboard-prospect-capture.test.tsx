/**
 * RED tests for Sprint 21 · Issue #237 — Leaderboard Prospect Capture
 *
 * These tests FAIL against current main (ProspectCaptureForm not yet added
 * to the leaderboard empty state). Bolt makes them green.
 *
 * Pipeline: Spec RED → Bolt GREEN → Watchdog → Forge merge
 * Plan: plans/sprint-21-237-leaderboard-prospect.md
 *
 * Coverage:
 *   Empty state (no scores):
 *     1. Existing "Scores Coming Soon" heading still renders (no regression)
 *     2. New panel heading "Want a ping when the scores post?" renders
 *     3. Panel body text renders
 *     4. Name input renders
 *     5. Email input renders
 *     6. "Get Notified" submit button renders
 *   Scores state (scores present):
 *     7. ProspectCaptureForm panel heading does NOT render (guard)
 *     8. Name/email inputs do NOT render (guard — only in empty state)
 *   Form submission:
 *     9. Fill name + email, submit, success message appears
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks — must be hoisted before any page imports
// ---------------------------------------------------------------------------

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import * as serverModule from "@/lib/supabase/server";

// Sprint 32: ScoreRow — nested JOIN shape returned by Supabase for
// "scores" + "team:teams(captain:contacts!teams_captain_contact_id_fkey(full_name))"
type DbScoreRow = {
  id: string;
  team_id: string | null;
  total_score: number;
  session: "morning" | "afternoon";
  year: number;
  team: { captain: { full_name: string } | null } | null;
};

function buildSupabaseMock(rows: DbScoreRow[]) {
  vi.mocked(serverModule.createClient).mockResolvedValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: rows, error: null }),
    }),
  } as unknown as Awaited<ReturnType<typeof serverModule.createClient>>);
}

// Sprint 32: fixtures use nested JOIN shape (team→captain), not team_name
const SAMPLE_SCORES: DbScoreRow[] = [
  { id: "1", team_id: "team-1", team: { captain: { full_name: "Mike Smith" } }, total_score: 62, session: "morning", year: 2026 },
  { id: "2", team_id: "team-2", team: { captain: { full_name: "Carol Jones" } }, total_score: 65, session: "afternoon", year: 2026 },
];

// ---------------------------------------------------------------------------
// Empty state (no scores)
// ---------------------------------------------------------------------------

describe("Leaderboard empty state — ProspectCaptureForm (#237)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn());
    buildSupabaseMock([]);
  });

  async function renderEmpty() {
    const { default: LeaderboardPage } = await import("../page");
    const jsx = await LeaderboardPage();
    return render(jsx as React.ReactElement);
  }

  it("still renders the existing 'Scores Coming Soon' heading (no regression)", async () => {
    await renderEmpty();
    expect(screen.getByText("Scores Coming Soon")).toBeInTheDocument();
  });

  it("still renders the existing 'Scores will be posted after the tournament.' text (no regression)", async () => {
    await renderEmpty();
    expect(
      screen.getByText("Scores will be posted after the tournament.")
    ).toBeInTheDocument();
  });

  it("renders the new panel heading 'Want a ping when the scores post?'", async () => {
    await renderEmpty();
    expect(
      screen.getByText("Want a ping when the scores post?")
    ).toBeInTheDocument();
  });

  it("renders the new panel body text", async () => {
    await renderEmpty();
    expect(
      screen.getByText(
        "Leave your name and email. We'll send you one note when this year's results are live."
      )
    ).toBeInTheDocument();
  });

  it("renders the name input (Your Name label)", async () => {
    await renderEmpty();
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
  });

  it("renders the email input (Email Address label)", async () => {
    await renderEmpty();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it("renders the Get Notified submit button", async () => {
    await renderEmpty();
    expect(
      screen.getByRole("button", { name: /get notified/i })
    ).toBeInTheDocument();
  });

  it("Get Notified button is not disabled by default", async () => {
    await renderEmpty();
    expect(
      screen.getByRole("button", { name: /get notified/i })
    ).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Scores state — ProspectCaptureForm must NOT appear
// ---------------------------------------------------------------------------

describe("Leaderboard scores state — ProspectCaptureForm absent (#237)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn());
    buildSupabaseMock(SAMPLE_SCORES);
  });

  async function renderWithScores() {
    const { default: LeaderboardPage } = await import("../page");
    const jsx = await LeaderboardPage();
    return render(jsx as React.ReactElement);
  }

  it("does NOT render 'Want a ping when the scores post?' when scores are present", async () => {
    await renderWithScores();
    expect(
      screen.queryByText("Want a ping when the scores post?")
    ).not.toBeInTheDocument();
  });

  it("does NOT render the name input when scores are present", async () => {
    await renderWithScores();
    expect(screen.queryByLabelText(/your name/i)).not.toBeInTheDocument();
  });

  it("does NOT render the email input when scores are present", async () => {
    await renderWithScores();
    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
  });

  it("does NOT render the Get Notified button when scores are present", async () => {
    await renderWithScores();
    expect(
      screen.queryByRole("button", { name: /get notified/i })
    ).not.toBeInTheDocument();
  });

  it("renders the score table with captain names when scores are present", async () => {
    await renderWithScores();
    // Sprint 32: team display = captain full name (no team_name column)
    expect(screen.getByText("Mike Smith")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Form submission — success message
// ---------------------------------------------------------------------------

describe("Leaderboard prospect form submission (#237)", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
    buildSupabaseMock([]);
  });

  it("shows success message 'We'll let you know the moment scores post.' after submission", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { default: LeaderboardPage } = await import("../page");
    const jsx = await LeaderboardPage();
    render(jsx as React.ReactElement);

    const nameInput = screen.getByLabelText(/your name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const submitBtn = screen.getByRole("button", { name: /get notified/i });

    // Use fireEvent.change per feedback_no_user_type_long_strings — no user.type for long strings
    fireEvent.change(nameInput, { target: { value: "Alex Johnson" } });
    fireEvent.change(emailInput, { target: { value: "alex@example.com" } });
    fireEvent.click(submitBtn);

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "We'll let you know the moment scores post."
      )
    );
  });

  it("sends POST to /api/contacts with contactType 'player'", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { default: LeaderboardPage } = await import("../page");
    const jsx = await LeaderboardPage();
    render(jsx as React.ReactElement);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Alex Johnson" },
    });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "alex@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /get notified/i }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    const [url, options] = mockFetch.mock.calls[0] as [
      string,
      RequestInit & { body: string },
    ];
    expect(url).toBe("/api/contacts");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body as string) as Record<string, string>;
    expect(body.type).toBe("player");
    expect(body.full_name).toBe("Alex Johnson");
    expect(body.email).toBe("alex@example.com");
  });
});
