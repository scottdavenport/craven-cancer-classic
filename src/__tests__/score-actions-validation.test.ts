/**
 * polish-186 + Sprint 32 (#282): updateScore — total_score range validation + team_name drop.
 *
 * These tests FAIL until Bolt/Flux implement:
 * - updateScore: reject NaN, negative, non-finite (Infinity), and > 200 values
 *   with { error: "Invalid total score" }, without calling Supabase .update().
 * - Sprint 32: ScoreInput drops team_name; updateScore payload uses team_id instead.
 *   Calling updateScore with team_name in the payload should ignore / not write team_name.
 *   The Supabase .update() call must NOT include team_name as a column.
 *
 * Issue: #186 (range validation), #282 (team_name drop)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ role: "admin" }),
}));

import * as serverModule from "@/lib/supabase/server";
import * as adminModule from "@/lib/supabase/admin";
import { updateScore } from "@/app/admin/scores/actions";

// Inline type alias for the current updateScore data param (pre-migration shape)
type CurrentScoreData = Parameters<typeof updateScore>[1];

/**
 * Sprint 32: updateScore's data param currently requires team_name (not team_id).
 * After migration, team_id replaces team_name. This cast helper lets
 * tests compile against the NEW shape while the OLD types are still in place.
 */
function sprint32ScoreInput(obj: Record<string, unknown>): CurrentScoreData {
  return obj as unknown as CurrentScoreData;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUpdateChain(overrides: { error?: unknown } = {}) {
  const mockEq = vi.fn().mockResolvedValue({ error: overrides.error ?? null });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
  const client = {
    from: vi.fn().mockReturnValue({ update: mockUpdate }),
  };
  vi.mocked(serverModule.createClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
  );
  return { mockUpdate, mockEq, client };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
});

// ---------------------------------------------------------------------------
// updateScore — total_score range validation
// ---------------------------------------------------------------------------

describe("updateScore — total_score range validation", () => {
  // ---- invalid inputs: should return { error } and NOT call .update() ----

  it("total_score = NaN → returns { error } matching /invalid|range/i, Supabase .update() NOT called", async () => {
    const { mockUpdate } = makeUpdateChain();

    const result = await updateScore("score-id-1", sprint32ScoreInput({
      team_id: "team-uuid-a", // Sprint 32: team_name dropped, team_id required
      total_score: NaN,
      session: "morning",
    }));

    expect((result as { error: string }).error).toMatch(/invalid|range/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("total_score = -1 → returns { error }, no Supabase update", async () => {
    const { mockUpdate } = makeUpdateChain();

    const result = await updateScore("score-id-1", sprint32ScoreInput({
      team_id: "team-uuid-a", // Sprint 32: team_name dropped, team_id required
      total_score: -1,
      session: "morning",
    }));

    expect((result as { error: string }).error).toMatch(/invalid|range/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("total_score = -0.5 → returns { error }, no Supabase update (non-integer negative also invalid)", async () => {
    const { mockUpdate } = makeUpdateChain();

    const result = await updateScore("score-id-1", sprint32ScoreInput({
      team_id: "team-uuid-a", // Sprint 32: team_name dropped, team_id required
      total_score: -0.5,
      session: "morning",
    }));

    expect((result as { error: string }).error).toMatch(/invalid|range/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("total_score = Infinity → returns { error }, no Supabase update", async () => {
    const { mockUpdate } = makeUpdateChain();

    const result = await updateScore("score-id-1", sprint32ScoreInput({
      team_id: "team-uuid-a", // Sprint 32: team_name dropped, team_id required
      total_score: Infinity,
      session: "afternoon",
    }));

    expect((result as { error: string }).error).toMatch(/invalid|range/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("total_score = 201 → returns { error }, no Supabase update (above 200 upper bound)", async () => {
    const { mockUpdate } = makeUpdateChain();

    const result = await updateScore("score-id-1", sprint32ScoreInput({
      team_id: "team-uuid-a", // Sprint 32: team_name dropped, team_id required
      total_score: 201,
      session: null,
    }));

    expect((result as { error: string }).error).toMatch(/invalid|range/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  // ---- valid inputs: should call Supabase .update() ----

  it("total_score = 0 → Supabase .update() is called (scratch hypothetical allowed)", async () => {
    const { mockUpdate } = makeUpdateChain();

    const result = await updateScore("score-id-1", sprint32ScoreInput({
      team_id: "team-uuid-a", // Sprint 32: team_name dropped, team_id required
      total_score: 0,
      session: "morning",
    }));

    expect((result as { error: string }).error).toBeUndefined();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("total_score = 72 → Supabase .update() is called (happy path)", async () => {
    const { mockUpdate } = makeUpdateChain();

    const result = await updateScore("score-id-1", sprint32ScoreInput({
      team_id: "team-uuid-a", // Sprint 32: team_name dropped, team_id required
      total_score: 72,
      session: "afternoon",
    }));

    expect((result as { error: string }).error).toBeUndefined();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("total_score = 200 → Supabase .update() is called (at upper bound boundary)", async () => {
    const { mockUpdate } = makeUpdateChain();

    const result = await updateScore("score-id-1", sprint32ScoreInput({
      team_id: "team-uuid-a", // Sprint 32: team_name dropped, team_id required
      total_score: 200,
      session: null,
    }));

    expect((result as { error: string }).error).toBeUndefined();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  // ---- call-order: requireAdmin must fire before .update() ----

  it("requireAdmin is called BEFORE Supabase .update() on a valid happy-path call", async () => {
    const { mockUpdate } = makeUpdateChain();

    await updateScore("score-id-1", sprint32ScoreInput({
      team_id: "team-uuid-a", // Sprint 32: team_name dropped, team_id required
      total_score: 72,
      session: "morning",
    }));

    const requireAdminOrder =
      vi.mocked(adminModule.requireAdmin).mock.invocationCallOrder[0];
    const updateOrder = mockUpdate.mock.invocationCallOrder[0];

    expect(requireAdminOrder).toBeLessThan(updateOrder);
  });
});

// ---------------------------------------------------------------------------
// Sprint 32 (#282): updateScore must NOT write team_name to Supabase
// RED until Flux drops team_name from ScoreInput + updateScore action
// ---------------------------------------------------------------------------

describe("updateScore — team_name column dropped (Sprint 32 RED)", () => {
  it("Supabase .update() payload does NOT include team_name", async () => {
    const { mockUpdate } = makeUpdateChain();

    await updateScore("score-id-sprint32", sprint32ScoreInput({
      team_id: "team-uuid-b",
      total_score: 72,
      session: "morning",
    }));

    // The update must have been called
    expect(mockUpdate).toHaveBeenCalledTimes(1);

    // The payload must not include team_name
    const updatePayload = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updatePayload).not.toHaveProperty("team_name");
  });

  it("score creation requires team_id, not team_name", async () => {
    // Verify the action accepts team_id as the team identifier
    const { mockUpdate } = makeUpdateChain();

    await updateScore("score-id-sprint32-b", sprint32ScoreInput({
      team_id: "team-uuid-c",
      total_score: 85,
      session: "afternoon",
    }));

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        team_id: "team-uuid-c",
      })
    );
  });
});
